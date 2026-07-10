"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";
import { getSupabase } from "@/lib/supabase";

// A4 portrait at ~150 DPI, used when no artwork is uploaded
const A4_W = 1240;
const A4_H = 1754;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function LabelSheet({ secret }: { secret: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [artSrc, setArtSrc] = useState<string>("");
  const [codes, setCodes] = useState<string[]>([]);
  const [batch, setBatch] = useState("");
  const [origin, setOrigin] = useState("");
  const [generating, setGenerating] = useState(false);

  // grid controls
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(5);
  const [qrPct, setQrPct] = useState(55); // % of the smaller cell dimension
  const [offX, setOffX] = useState(0); // % nudge
  const [offY, setOffY] = useState(0);
  const [showCode, setShowCode] = useState(true);

  const total = cols * rows;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setArtSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function generate() {
    setGenerating(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("move_admin_generate_codes", {
      p_secret: secret,
      p_count: total,
      p_batch: batch || null,
    });
    setGenerating(false);
    if (error) {
      alert("Erro ao gerar códigos.");
      return;
    }
    setCodes((data as string[]) ?? []);
  }

  const compose = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let bgW = A4_W;
    let bgH = A4_H;
    let art: HTMLImageElement | null = null;
    if (artSrc) {
      art = await loadImage(artSrc);
      bgW = art.naturalWidth;
      bgH = art.naturalHeight;
    }
    canvas.width = bgW;
    canvas.height = bgH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // background
    if (art) {
      ctx.drawImage(art, 0, 0, bgW, bgH);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, bgW, bgH);
      // faint grid guides
      ctx.strokeStyle = "#e5e5e5";
      ctx.lineWidth = 2;
      for (let c = 1; c < cols; c++) {
        const x = (bgW / cols) * c;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, bgH);
        ctx.stroke();
      }
      for (let r = 1; r < rows; r++) {
        const y = (bgH / rows) * r;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(bgW, y);
        ctx.stroke();
      }
    }

    const cellW = bgW / cols;
    const cellH = bgH / rows;
    const qrSize = (Math.min(cellW, cellH) * qrPct) / 100;

    for (let i = 0; i < Math.min(codes.length, total); i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const cx = cellW * c + cellW / 2 + (offX / 100) * cellW;
      const cy = cellH * r + cellH / 2 + (offY / 100) * cellH;

      const url = `${origin}/s/${codes[i]}`;
      const qrDataUrl = await QRCodeLib.toDataURL(url, {
        width: Math.round(qrSize),
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      const qrImg = await loadImage(qrDataUrl);

      const qx = cx - qrSize / 2;
      const qy = cy - qrSize / 2;
      // white pad behind QR so it scans over dark art
      ctx.fillStyle = "#ffffff";
      const pad = qrSize * 0.06;
      ctx.fillRect(qx - pad, qy - pad, qrSize + pad * 2, qrSize + pad * 2);
      ctx.drawImage(qrImg, qx, qy, qrSize, qrSize);

      if (showCode) {
        ctx.fillStyle = "#000000";
        ctx.font = `bold ${Math.round(qrSize * 0.13)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(codes[i], cx, qy + qrSize + pad * 2);
      }
    }
  }, [artSrc, codes, cols, rows, qrPct, offX, offY, showCode, origin, total]);

  useEffect(() => {
    compose();
  }, [compose]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `moveplus-folha-${batch || "a4"}.png`;
    a.click();
  }

  function print() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("");
    if (!w) return;
    w.document.write(
      `<html><head><title>MOVE+ folha</title><style>@page{size:A4;margin:0}body{margin:0}img{width:100%;display:block}</style></head><body><img src="${dataUrl}" onload="window.print()"/></body></html>`,
    );
    w.document.close();
  }

  const num = (v: string) => Number(v) || 0;

  return (
    <div>
      <h2 className="font-display text-2xl uppercase text-white">
        Folha A4 · QR nos rótulos
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        Suba a arte da sua folha A4 (com os rótulos), ajuste a grade pra encaixar
        um QR único em cada rótulo, gere os códigos e baixe/imprima. Cada QR
        aponta pro código único da garrafa.
      </p>

      {/* controls */}
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
              Sem arte? Uso uma folha branca com grade pra você testar.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-move-panel p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Ctrl label={`Colunas: ${cols}`}>
                <input type="range" min={1} max={5} value={cols}
                  onChange={(e) => setCols(num(e.target.value))} className="w-full accent-move-yellow" />
              </Ctrl>
              <Ctrl label={`Linhas: ${rows}`}>
                <input type="range" min={1} max={8} value={rows}
                  onChange={(e) => setRows(num(e.target.value))} className="w-full accent-move-yellow" />
              </Ctrl>
            </div>
            <Ctrl label={`Tamanho do QR: ${qrPct}%`}>
              <input type="range" min={20} max={95} value={qrPct}
                onChange={(e) => setQrPct(num(e.target.value))} className="w-full accent-move-yellow" />
            </Ctrl>
            <div className="grid grid-cols-2 gap-3">
              <Ctrl label={`Ajuste ↔: ${offX}%`}>
                <input type="range" min={-40} max={40} value={offX}
                  onChange={(e) => setOffX(num(e.target.value))} className="w-full accent-move-yellow" />
              </Ctrl>
              <Ctrl label={`Ajuste ↕: ${offY}%`}>
                <input type="range" min={-40} max={40} value={offY}
                  onChange={(e) => setOffY(num(e.target.value))} className="w-full accent-move-yellow" />
              </Ctrl>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input type="checkbox" checked={showCode}
                onChange={(e) => setShowCode(e.target.checked)} className="accent-move-yellow" />
              Escrever o código embaixo do QR
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-move-panel p-4 space-y-3">
            <Ctrl label="Lote (opcional)">
              <input value={batch} onChange={(e) => setBatch(e.target.value)}
                placeholder="ex: folha-01"
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none" />
            </Ctrl>
            <button
              onClick={generate}
              disabled={generating}
              className="w-full rounded-lg bg-move-yellow px-4 py-2.5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-60"
            >
              {generating ? "Gerando…" : `Gerar ${total} códigos`}
            </button>
            {codes.length > 0 && (
              <p className="text-xs text-neutral-400">
                {codes.length} código(s) neste lote. Gerar de novo cria novos códigos.
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={download} disabled={codes.length === 0}
                className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-move-yellow disabled:opacity-40">
                ⬇ Baixar PNG
              </button>
              <button onClick={print} disabled={codes.length === 0}
                className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-move-yellow disabled:opacity-40">
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>

        {/* preview */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
          <p className="mb-3 text-xs font-semibold uppercase text-neutral-500">
            Prévia {codes.length === 0 && "(gere os códigos pra aparecerem os QR)"}
          </p>
          <div className="mx-auto max-w-md overflow-hidden rounded-lg bg-white">
            <canvas ref={canvasRef} className="h-auto w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Ctrl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
