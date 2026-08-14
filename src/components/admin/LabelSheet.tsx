"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";
import { getSupabase } from "@/lib/supabase";

interface Slot {
  id: number;
  x: number; // center %, of width
  y: number; // center %, of height
  size: number; // %, of width (square box)
}

interface PrintLog {
  id: string;
  batch: string | null;
  action: string;
  count: number;
  created_at: string;
}

const DEFAULT_SLOTS: Slot[] = Array.from({ length: 10 }, (_, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return { id: i + 1, x: 25 + col * 50, y: 10 + row * 18, size: 18 };
});

const A4_RATIO = 210 / 297; // width/height

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function downscaleImage(
  dataUrl: string,
  maxWidth = 1800,
): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve) => {
    loadImage(dataUrl).then((img) => {
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      // flatten on white so transparent PNGs don't turn black as JPEG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.85), w, h });
    });
  });
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Finds the sample/placeholder QR squares in the artwork: big bright
 * (white-ish) blobs that are roughly square. Returns slots in reading
 * order (top-to-bottom, left-to-right), sized/positioned as percentages.
 */
async function detectQrSlots(dataUrl: string): Promise<Slot[]> {
  const img = await loadImage(dataUrl);
  const maxW = 900;
  const scale = Math.min(1, maxW / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // bright mask — QR placeholders are white/gray blocks; the yellow frame
  // fails the blue-channel check, the dark background fails everything
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    if (r > 120 && g > 120 && b > 120) mask[i] = 1;
  }

  // connected components (4-neighbour flood fill, iterative)
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const found: { cx: number; cy: number; size: number }[] = [];

  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || seen[start]) continue;
    let minX = w, maxX = 0, minY = h, maxY = 0, count = 0;
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % w;
      const py = (p / w) | 0;
      count++;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      if (px > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (px < w - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (py > 0 && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
      if (py < h - 1 && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    if (bw < w * 0.03 || bw > w * 0.35) continue; // too small / too big
    const aspect = bw / bh;
    if (aspect < 0.7 || aspect > 1.4) continue; // not square-ish
    const fill = count / (bw * bh);
    if (fill < 0.3) continue; // hollow shapes (text blocks, frames)
    found.push({
      cx: ((minX + bw / 2) / w) * 100,
      cy: ((minY + bh / 2) / h) * 100,
      size: (bw / w) * 100,
    });
  }

  // reading order: group into rows by vertical proximity, then sort by x
  found.sort((a, b) => a.cy - b.cy);
  const rows: (typeof found)[] = [];
  for (const f of found) {
    const row = rows.find(
      (r) => Math.abs(r[0].cy - f.cy) < Math.max(f.size, 3),
    );
    if (row) row.push(f);
    else rows.push([f]);
  }
  const ordered = rows.flatMap((r) => r.sort((a, b) => a.cx - b.cx));

  return ordered.map((f, i) => ({
    id: i + 1,
    x: f.cx,
    y: f.cy,
    size: f.size,
  }));
}

function timestampName() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function LabelSheet({ secret }: { secret: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    id: number;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    orig: Slot;
  } | null>(null);

  const [artSrc, setArtSrc] = useState("");
  const [artDims, setArtDims] = useState({ w: 1240, h: 1754 });
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_SLOTS);
  const [codes, setCodes] = useState<string[]>([]);
  const [batch, setBatch] = useState("");
  const [origin, setOrigin] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [history, setHistory] = useState<PrintLog[]>([]);
  const [showCode, setShowCode] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // lock page scroll while the fullscreen editor is open
  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded]);

  const loadHistory = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.rpc("move_admin_list_label_prints", {
      p_secret: secret,
      p_limit: 30,
    });
    setHistory((data as PrintLog[]) ?? []);
  }, [secret]);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase.rpc("move_admin_get_label_template", {
        p_secret: secret,
      });
      const row = data as { art_data_url: string | null; layout: Slot[] } | null;
      if (row?.layout?.length) setSlots(row.layout);
      if (row?.art_data_url) {
        setArtSrc(row.art_data_url);
        const img = await loadImage(row.art_data_url);
        setArtDims({ w: img.naturalWidth, h: img.naturalHeight });
      }
      setLoadingTpl(false);
      loadHistory();
    })();
  }, [secret, loadHistory]);

  async function runDetection(src: string) {
    setDetecting(true);
    setDetectMsg("");
    try {
      const detected = await detectQrSlots(src);
      if (detected.length > 0) {
        setSlots(detected);
        setSelected(null);
        setCodes([]);
        setDetectMsg(`✨ ${detected.length} QRs detectados e alinhados automaticamente!`);
      } else {
        setDetectMsg("Não achei QRs de exemplo na arte — posicione manualmente.");
      }
    } catch {
      setDetectMsg("Erro ao analisar a imagem.");
    }
    setDetecting(false);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const { dataUrl, w, h } = await downscaleImage(reader.result as string);
      setArtSrc(dataUrl);
      setArtDims({ w, h });
      // the art usually carries sample QRs — find them and align the slots
      runDetection(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function addSlot() {
    const id = (slots.reduce((m, s) => Math.max(m, s.id), 0) || 0) + 1;
    setSlots((s) => [...s, { id, x: 50, y: 50, size: 18 }]);
    setSelected(id);
    setCodes([]);
  }
  function removeSlot(id: number) {
    setSlots((s) => s.filter((sl) => sl.id !== id));
    if (selected === id) setSelected(null);
    setCodes([]);
  }

  const selectedSlot = slots.find((s) => s.id === selected) ?? null;

  function updateSelected(patch: Partial<Slot>) {
    if (selected == null) return;
    setSlots((prev) =>
      prev.map((s) => (s.id === selected ? { ...s, ...patch } : s)),
    );
  }

  function onSlotPointerDown(
    e: React.PointerEvent,
    id: number,
    mode: "move" | "resize",
  ) {
    e.stopPropagation();
    e.preventDefault();
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;
    setSelected(id);
    drag.current = { id, mode, startX: e.clientX, startY: e.clientY, orig: slot };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { id, mode, orig, startX, startY } = drag.current;
    const dxPct = ((e.clientX - startX) / rect.width) * 100;
    const dyPct = ((e.clientY - startY) / rect.height) * 100;
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (mode === "move") {
          return { ...s, x: clamp(orig.x + dxPct, 2, 98), y: clamp(orig.y + dyPct, 2, 98) };
        }
        return { ...s, size: clamp(orig.size + dxPct, 4, 60) };
      }),
    );
  }

  function onPointerUp() {
    drag.current = null;
  }

  async function generateCodes() {
    if (slots.length === 0) return alert("Adicione pelo menos um QR na folha.");
    setGenerating(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("move_admin_generate_codes", {
      p_secret: secret,
      p_count: slots.length,
      p_batch: batch || null,
    });
    setGenerating(false);
    if (error) return alert("Erro ao gerar códigos.");
    setCodes((data as string[]) ?? []);
  }

  async function saveTemplate() {
    setSaving(true);
    const supabase = getSupabase();
    await supabase.rpc("move_admin_save_label_template", {
      p_secret: secret,
      p_art_data_url: artSrc || null,
      p_layout: slots,
    });
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  async function compose(): Promise<HTMLCanvasElement | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bgW = artDims.w;
    const bgH = artDims.h;
    canvas.width = bgW;
    canvas.height = bgH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, bgW, bgH);
    if (artSrc) {
      const img = await loadImage(artSrc);
      ctx.drawImage(img, 0, 0, bgW, bgH);
    }

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const code = codes[i];
      if (!code) continue;
      const qrSize = (slot.size / 100) * bgW;
      const cx = (slot.x / 100) * bgW;
      const cy = (slot.y / 100) * bgH;
      const url = `${origin}/s/${code}`;
      const qrDataUrl = await QRCodeLib.toDataURL(url, {
        width: Math.round(qrSize),
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      const qrImg = await loadImage(qrDataUrl);
      const qx = cx - qrSize / 2;
      const qy = cy - qrSize / 2;
      const pad = qrSize * 0.06;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qx - pad, qy - pad, qrSize + pad * 2, qrSize + pad * 2);
      ctx.drawImage(qrImg, qx, qy, qrSize, qrSize);
      if (showCode) {
        ctx.fillStyle = "#000000";
        ctx.font = `bold ${Math.round(qrSize * 0.13)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(code, cx, qy + qrSize + pad * 2);
      }
    }
    return canvas;
  }

  async function logPrint(action: "download" | "print") {
    const supabase = getSupabase();
    await supabase.rpc("move_admin_log_label_print", {
      p_secret: secret,
      p_batch: batch || null,
      p_action: action,
      p_codes: codes,
    });
    loadHistory();
  }

  async function download() {
    if (codes.length === 0) return alert("Gere os códigos primeiro.");
    const canvas = await compose();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `moveplus-folha-${batch || "sem-lote"}-${timestampName()}.png`;
    a.click();
    logPrint("download");
  }

  async function printSheet() {
    if (codes.length === 0) return alert("Gere os códigos primeiro.");
    const canvas = await compose();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("");
    if (!w) return;
    w.document.write(
      `<html><head><title>Folha Água Premiada</title><style>@page{size:A4;margin:0}body{margin:0}img{width:100%;display:block}</style></head><body><img src="${dataUrl}" onload="window.print()"/></body></html>`,
    );
    w.document.close();
    logPrint("print");
  }

  const aspectRatio = artSrc ? artDims.w / artDims.h : A4_RATIO;

  /* ---------- editor pieces (rendered inline OR fullscreen) ---------- */

  const zoomBar = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => setZoom((z) => clamp(z - 0.5, 1, 4))}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-bold text-neutral-200 hover:border-move-yellow"
      >
        −
      </button>
      <span className="min-w-[3.5rem] text-center text-xs font-bold text-neutral-300">
        🔍 {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => setZoom((z) => clamp(z + 0.5, 1, 4))}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-bold text-neutral-200 hover:border-move-yellow"
      >
        +
      </button>
      {zoom > 1 && (
        <button
          onClick={() => setZoom(1)}
          className="rounded-lg border border-white/15 px-2 py-1.5 text-xs font-semibold text-neutral-400 hover:border-move-yellow"
        >
          100%
        </button>
      )}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="ml-auto rounded-lg bg-move-yellow px-3 py-1.5 text-xs font-black uppercase text-black"
      >
        {expanded ? "✕ Fechar" : "⛶ Tela cheia"}
      </button>
    </div>
  );

  const editorCanvas = (
    <div
      className="overflow-auto rounded-lg border border-white/10 bg-neutral-800"
      style={{ maxHeight: expanded ? "none" : "70vh", flex: expanded ? 1 : undefined }}
    >
      <div style={{ width: `${zoom * 100}%` }}>
        <div
          ref={containerRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative w-full select-none bg-white"
          style={{ aspectRatio: `${aspectRatio}` }}
        >
          {artSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artSrc}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-white" />
          )}
          {slots.map((slot) => (
            <div
              key={slot.id}
              onPointerDown={(e) => onSlotPointerDown(e, slot.id, "move")}
              onClick={() => setSelected(slot.id)}
              className={`absolute flex cursor-move items-center justify-center border-2 ${
                selected === slot.id
                  ? "border-move-yellow bg-move-yellow/20"
                  : "border-black/40 bg-black/10"
              }`}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.size}%`,
                aspectRatio: "1 / 1",
                transform: "translate(-50%, -50%)",
                touchAction: "none",
              }}
            >
              <span className="pointer-events-none text-[10px] font-bold text-black/70">
                {codes[slots.findIndex((s) => s.id === slot.id)] || "QR"}
              </span>
              <div
                onPointerDown={(e) => onSlotPointerDown(e, slot.id, "resize")}
                className="absolute -bottom-1.5 -right-1.5 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-move-yellow"
                style={{ touchAction: "none" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const sliderPanel = selectedSlot && (
    <div className="mt-3 rounded-xl border border-move-yellow/40 bg-move-panel p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-move-yellow">
          🎯 QR selecionado — ajuste fino
        </p>
        <button
          onClick={() => removeSlot(selectedSlot.id)}
          className="text-xs font-bold text-red-400/80 hover:text-red-400"
        >
          Remover
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-neutral-500">
            ↔ Horizontal: {selectedSlot.x.toFixed(1)}%
          </span>
          <input
            type="range"
            min={2}
            max={98}
            step={0.2}
            value={selectedSlot.x}
            onChange={(e) => updateSelected({ x: Number(e.target.value) })}
            className="w-full accent-move-yellow"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-neutral-500">
            ↕ Vertical: {selectedSlot.y.toFixed(1)}%
          </span>
          <input
            type="range"
            min={2}
            max={98}
            step={0.2}
            value={selectedSlot.y}
            onChange={(e) => updateSelected({ y: Number(e.target.value) })}
            className="w-full accent-move-yellow"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-neutral-500">
            ⬜ Tamanho: {selectedSlot.size.toFixed(1)}%
          </span>
          <input
            type="range"
            min={4}
            max={60}
            step={0.2}
            value={selectedSlot.size}
            onChange={(e) => updateSelected({ size: Number(e.target.value) })}
            className="w-full accent-move-yellow"
          />
        </label>
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="font-display text-2xl uppercase text-white">
        Folha A4 · QR nos rótulos
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        Toque num QR pra selecionar e use as barrinhas de ajuste fino (ou
        arraste). Use o zoom e a tela cheia pra encaixar certinho. Clique em{" "}
        <b>Salvar layout</b> — da próxima vez tudo carrega automático.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-move-panel p-4">
            <label className="block text-xs font-semibold uppercase text-neutral-500">
              Arte da folha (A4)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={onUpload}
              className="mt-2 w-full text-xs text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-move-yellow file:px-3 file:py-2 file:text-xs file:font-bold file:text-black"
            />
            <p className="mt-2 text-xs text-neutral-600">
              {artSrc
                ? "Arte carregada e salva. Suba outra pra substituir."
                : "Sem arte, mostro uma folha em branco pra você posicionar."}
            </p>
            {artSrc && (
              <button
                onClick={() => runDetection(artSrc)}
                disabled={detecting}
                className="mt-3 w-full rounded-lg border border-move-yellow/50 px-3 py-2 text-xs font-bold text-move-yellow hover:bg-move-yellow/10 disabled:opacity-60"
              >
                {detecting ? "Analisando arte…" : "🪄 Detectar QRs automaticamente"}
              </button>
            )}
            {detectMsg && (
              <p className="mt-2 text-xs font-semibold text-move-yellow">{detectMsg}</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-move-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-neutral-500">
                {slots.length} QR na folha
              </p>
              <button
                onClick={addSlot}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs font-bold text-neutral-200 hover:border-move-yellow"
              >
                + Adicionar
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={showCode}
                onChange={(e) => setShowCode(e.target.checked)}
                className="accent-move-yellow"
              />
              Escrever o código embaixo do QR
            </label>
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="w-full rounded-lg bg-move-yellow px-4 py-2.5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-60"
            >
              {saving ? "Salvando…" : savedFlash ? "✓ Layout salvo" : "💾 Salvar layout"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-move-panel p-4 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-neutral-500">
                Lote (opcional)
              </span>
              <input
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="ex: folha-01"
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
              />
            </label>
            <button
              onClick={generateCodes}
              disabled={generating}
              className="w-full rounded-lg bg-move-yellow px-4 py-2.5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-60"
            >
              {generating ? "Gerando…" : `Gerar ${slots.length} códigos`}
            </button>
            {codes.length > 0 && (
              <p className="text-xs text-neutral-400">
                {codes.length} código(s) prontos pra esta folha.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={download}
                disabled={codes.length === 0}
                className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-move-yellow disabled:opacity-40"
              >
                ⬇ Baixar PNG
              </button>
              <button
                onClick={printSheet}
                disabled={codes.length === 0}
                className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-move-yellow disabled:opacity-40"
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>

        {/* inline editor (hidden while fullscreen is open) */}
        {!expanded && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-neutral-500">
              {loadingTpl
                ? "Carregando layout salvo…"
                : "Toque num QR pra selecionar. Arraste ou use as barrinhas."}
            </p>
            {zoomBar}
            <div className="mt-3">{editorCanvas}</div>
            {sliderPanel}
          </div>
        )}
      </div>

      {/* fullscreen editor overlay */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 p-3">
          {zoomBar}
          <div className="mt-3 flex min-h-0 flex-1 flex-col">{editorCanvas}</div>
          {sliderPanel}
          <div className="mt-3 flex gap-2">
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="flex-1 rounded-lg bg-move-yellow px-4 py-2.5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-60"
            >
              {saving ? "Salvando…" : savedFlash ? "✓ Salvo" : "💾 Salvar layout"}
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-bold text-neutral-200"
            >
              Concluir
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <h3 className="mt-8 text-sm font-bold uppercase tracking-wide text-neutral-400">
        Histórico de folhas geradas
      </h3>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Quando</th>
              <th className="px-4 py-2">Lote</th>
              <th className="px-4 py-2">Ação</th>
              <th className="px-4 py-2">Códigos</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-5 text-neutral-500">
                  Nenhuma folha gerada ainda.
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-neutral-300">
                    {new Date(h.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2 text-move-yellow">{h.batch ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-400">
                    {h.action === "print" ? "🖨️ Impressão" : "⬇ Download"}
                  </td>
                  <td className="px-4 py-2 text-neutral-300">{h.count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
