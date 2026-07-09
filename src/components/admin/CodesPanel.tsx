"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { QRCode } from "./QRCode";

interface BottleRow {
  code: string;
  batch: string | null;
  status: string;
  scan_count: number;
  experience_title: string | null;
  first_scanned_at: string | null;
  created_at: string;
}

export function CodesPanel({ secret }: { secret: string }) {
  const [count, setCount] = useState(10);
  const [batch, setBatch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const [bottles, setBottles] = useState<BottleRow[]>([]);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const loadBottles = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.rpc("move_admin_list_bottles", {
      p_secret: secret,
      p_batch: null,
      p_limit: 100,
    });
    setBottles((data as BottleRow[]) ?? []);
  }, [secret]);

  useEffect(() => {
    loadBottles();
  }, [loadBottles]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGenerating(true);
    const supabase = getSupabase();
    const { data, error: err } = await supabase.rpc("move_admin_generate_codes", {
      p_secret: secret,
      p_count: count,
      p_batch: batch || null,
    });
    setGenerating(false);
    if (err) {
      setError("Erro ao gerar códigos.");
      return;
    }
    // rpc returning setof text -> array of strings
    const codes = (data as string[]) ?? [];
    setGenerated(codes);
    loadBottles();
  }

  function scanUrl(code: string) {
    return `${origin}/s/${code}`;
  }

  function printSheet() {
    window.print();
  }

  return (
    <div>
      <h2 className="font-display text-2xl uppercase text-white">Códigos das garrafas</h2>

      {/* generator */}
      <form
        onSubmit={generate}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-move-panel p-5 print:hidden"
      >
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Quantidade
          </label>
          <input
            type="number"
            min={1}
            max={5000}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 w-28 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Lote (opcional)
          </label>
          <input
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="ex: lote-01"
            className="mt-1 w-44 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={generating}
          className="rounded-lg bg-move-yellow px-5 py-2.5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-60"
        >
          {generating ? "Gerando…" : "Gerar códigos"}
        </button>
        {error && <p className="w-full text-sm text-red-400">{error}</p>}
      </form>

      {/* generated batch with QR sheet */}
      {generated.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between print:hidden">
            <p className="text-sm text-neutral-400">
              {generated.length} código(s) gerado(s){batch ? ` no lote "${batch}"` : ""}.
            </p>
            <button
              onClick={printSheet}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-neutral-200 hover:border-move-yellow"
            >
              🖨️ Imprimir folha de QR
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {generated.map((code) => (
              <div
                key={code}
                className="flex flex-col items-center rounded-xl border border-white/10 bg-white p-3"
              >
                <QRCode value={scanUrl(code)} size={110} />
                <p className="mt-2 font-mono text-sm font-bold tracking-widest text-black">
                  {code}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* existing bottles */}
      <h3 className="mt-10 text-sm font-bold uppercase tracking-wide text-neutral-400 print:hidden">
        Últimas garrafas
      </h3>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 print:hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Lote</th>
              <th className="px-4 py-2">Scans</th>
              <th className="px-4 py-2">Experiência</th>
              <th className="px-4 py-2">Criado</th>
            </tr>
          </thead>
          <tbody>
            {bottles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-neutral-500">
                  Nenhuma garrafa ainda. Gere os primeiros códigos acima.
                </td>
              </tr>
            ) : (
              bottles.map((b) => (
                <tr key={b.code} className="border-t border-white/5">
                  <td className="px-4 py-2 font-mono text-move-yellow">{b.code}</td>
                  <td className="px-4 py-2 text-neutral-400">{b.batch ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-300">{b.scan_count}</td>
                  <td className="px-4 py-2 text-neutral-300">
                    {b.experience_title ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {new Date(b.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
