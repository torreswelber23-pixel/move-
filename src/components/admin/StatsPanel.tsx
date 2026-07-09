"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface Stats {
  total_bottles: number;
  scanned_bottles: number;
  total_scans: number;
  total_experiences: number;
  active_experiences: number;
  scans_today: number;
  recent_scans: {
    code: string;
    created_at: string;
    is_first: boolean;
    experience_title: string | null;
  }[];
}

export function StatsPanel({ secret }: { secret: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    const { data } = await supabase.rpc("move_admin_stats", { p_secret: secret });
    setStats(data as Stats);
    setLoading(false);
  }, [secret]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !stats) {
    return <p className="text-neutral-500">Carregando…</p>;
  }

  const cards = [
    { label: "Garrafas geradas", value: stats.total_bottles },
    { label: "Garrafas escaneadas", value: stats.scanned_bottles },
    { label: "Total de scans", value: stats.total_scans },
    { label: "Scans hoje", value: stats.scans_today },
    { label: "Experiências ativas", value: stats.active_experiences },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl uppercase text-white">Visão geral</h2>
        <button
          onClick={load}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-move-yellow"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/10 bg-move-panel p-4"
          >
            <p className="font-display text-4xl text-move-yellow">{c.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {c.label}
            </p>
          </div>
        ))}
      </div>

      <h3 className="mt-10 text-sm font-bold uppercase tracking-wide text-neutral-400">
        Scans recentes
      </h3>
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
        {stats.recent_scans.length === 0 ? (
          <p className="p-5 text-sm text-neutral-500">Nenhum scan ainda.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Experiência</th>
                <th className="px-4 py-2">Quando</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_scans.map((s, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-4 py-2 font-mono text-move-yellow">
                    {s.code}
                    {s.is_first && (
                      <span className="ml-2 text-[10px] text-neutral-500">1º</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-neutral-300">
                    {s.experience_title ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {new Date(s.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
