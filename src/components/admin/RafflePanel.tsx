"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface Entry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  code: string | null;
  is_winner: boolean;
  created_at: string;
}

interface Settings {
  prize_label?: string;
  whatsapp_group_link?: string;
  raffle_open?: string;
  code_ttl_minutes?: string;
  where_to_buy?: string;
}

export function RafflePanel({ secret }: { secret: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [drawing, setDrawing] = useState(false);
  const [justWon, setJustWon] = useState<Entry | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const supabase = getSupabase();

  const load = useCallback(async () => {
    const [e, s] = await Promise.all([
      supabase.rpc("move_admin_list_entries", { p_secret: secret, p_limit: 5000 }),
      supabase.rpc("move_admin_get_settings", { p_secret: secret }),
    ]);
    setEntries((e.data as Entry[]) ?? []);
    setSettings((s.data as Settings) ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSetting(key: string, value: string) {
    await supabase.rpc("move_admin_set_setting", {
      p_secret: secret,
      p_key: key,
      p_value: value,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  async function draw() {
    if (!confirm("Sortear um ganhador agora? Essa ação marca a pessoa como ganhadora.")) return;
    setDrawing(true);
    setJustWon(null);
    // little suspense
    await new Promise((r) => setTimeout(r, 1200));
    const { data } = await supabase.rpc("move_admin_draw_winner", { p_secret: secret });
    setDrawing(false);
    const res = data as { ok: boolean; winner?: Entry; error?: string };
    if (res?.ok && res.winner) {
      setJustWon(res.winner);
      load();
    } else {
      alert(res?.error === "no_entries" ? "Ainda não há participantes." : "Erro ao sortear.");
    }
  }

  function exportCsv() {
    const rows = [
      ["nome", "whatsapp", "email", "codigo", "ganhador", "data"],
      ...entries.map((e) => [
        e.name,
        e.phone,
        e.email ?? "",
        e.code ?? "",
        e.is_winner ? "SIM" : "",
        new Date(e.created_at).toLocaleString("pt-BR"),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "moveplus-participantes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const raffleOpen = (settings.raffle_open ?? "true") === "true";
  const winners = entries.filter((e) => e.is_winner);

  return (
    <div>
      <h2 className="font-display text-2xl uppercase text-white">Sorteio R$100</h2>

      {/* draw box */}
      <div className="mt-6 rounded-2xl border border-move-yellow/40 bg-move-yellow/5 p-6 text-center">
        {drawing ? (
          <div className="py-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center">
              <span className="text-5xl animate-pulse">🎰</span>
            </div>
            <p className="mt-4 animate-pulse font-display text-xl uppercase tracking-widest text-move-yellow">
              Sorteando…
            </p>
          </div>
        ) : justWon ? (
          <div className="py-4 animate-reveal">
            <div className="text-6xl">🏆</div>
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-move-yellow">
              Ganhador sorteado!
            </p>
            <p className="mt-1 font-display text-4xl uppercase text-white">{justWon.name}</p>
            <p className="mt-1 font-mono text-lg text-move-yellow">{justWon.phone}</p>
            <a
              href={`https://wa.me/55${justWon.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-lg bg-[#25D366] px-5 py-2 text-sm font-bold text-black"
            >
              Falar no WhatsApp
            </a>
          </div>
        ) : (
          <div className="py-2">
            <p className="font-display text-5xl text-move-yellow">{entries.length}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              participantes na disputa
            </p>
            <button
              onClick={draw}
              disabled={entries.length === 0}
              className="mt-5 rounded-xl bg-move-yellow px-8 py-4 text-base font-black uppercase tracking-wider text-black transition hover:brightness-95 disabled:opacity-50"
            >
              🎲 Sortear ganhador
            </button>
          </div>
        )}
      </div>

      {winners.length > 0 && !justWon && (
        <div className="mt-4 rounded-xl border border-move-yellow/40 bg-move-panel p-4">
          <p className="text-xs font-bold uppercase text-move-yellow">Já sorteados</p>
          {winners.map((w) => (
            <p key={w.id} className="mt-1 text-white">
              🏆 {w.name} · <span className="font-mono text-move-yellow">{w.phone}</span>
            </p>
          ))}
        </div>
      )}

      {/* settings */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-move-panel p-5">
          <label className="text-xs font-semibold uppercase text-neutral-500">
            Rótulo do prêmio
          </label>
          <div className="mt-1 flex gap-2">
            <input
              defaultValue={settings.prize_label ?? "R$100 no PIX"}
              onBlur={(e) => saveSetting("prize_label", e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-move-panel p-5">
          <label className="text-xs font-semibold uppercase text-neutral-500">
            Link do grupo do WhatsApp
          </label>
          <input
            defaultValue={settings.whatsapp_group_link ?? ""}
            onBlur={(e) => saveSetting("whatsapp_group_link", e.target.value)}
            placeholder="https://chat.whatsapp.com/…"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <div className="rounded-2xl border border-white/10 bg-move-panel p-5">
          <label className="text-xs font-semibold uppercase text-neutral-500">
            Validade do código (minutos)
          </label>
          <input
            type="number"
            min={0}
            defaultValue={settings.code_ttl_minutes ?? "60"}
            onBlur={(e) => saveSetting("code_ttl_minutes", e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-600">0 = sem expiração por tempo (só uso único).</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-move-panel p-5">
          <label className="text-xs font-semibold uppercase text-neutral-500">
            Onde comprar (link / WhatsApp)
          </label>
          <input
            defaultValue={settings.where_to_buy ?? ""}
            onBlur={(e) => saveSetting("where_to_buy", e.target.value)}
            placeholder="https://wa.me/55… ou link da loja"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-600">Aparece pra quem pega um código expirado.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={raffleOpen}
            onChange={(e) => {
              setSettings({ ...settings, raffle_open: String(e.target.checked) });
              saveSetting("raffle_open", String(e.target.checked));
            }}
            className="accent-move-yellow"
          />
          Sorteio aberto (aceitando cadastros)
        </label>
        {savedFlash && <span className="text-xs text-move-yellow">✓ salvo</span>}
      </div>

      {/* participants */}
      <div className="mt-8 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-400">
          Participantes ({entries.length})
        </h3>
        <button
          onClick={exportCsv}
          disabled={entries.length === 0}
          className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-neutral-200 hover:border-move-yellow disabled:opacity-40"
        >
          ⬇ Exportar CSV
        </button>
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">WhatsApp</th>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Quando</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-5 text-neutral-500">
                  Nenhum participante ainda.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-white">
                    {e.name}
                    {e.is_winner && <span className="ml-2">🏆</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-neutral-300">{e.phone}</td>
                  <td className="px-4 py-2 font-mono text-move-yellow">{e.code}</td>
                  <td className="px-4 py-2 text-neutral-500">
                    {new Date(e.created_at).toLocaleDateString("pt-BR")}
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
