"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { MoveLogo } from "@/components/MoveLogo";
import { StatsPanel } from "@/components/admin/StatsPanel";
import { CodesPanel } from "@/components/admin/CodesPanel";
import { ExperiencesPanel } from "@/components/admin/ExperiencesPanel";

type Tab = "stats" | "codes" | "experiences";

export default function AdminPage() {
  const [secret, setSecret] = useState<string>("");
  const [input, setInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("stats");

  useEffect(() => {
    const saved = sessionStorage.getItem("move_admin_secret");
    if (saved) {
      setSecret(saved);
      setAuthed(true);
    }
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = getSupabase();
    // validate by trying a gated call
    const { error: err } = await supabase.rpc("move_admin_stats", {
      p_secret: input,
    });
    setLoading(false);
    if (err) {
      setError("Senha incorreta.");
      return;
    }
    sessionStorage.setItem("move_admin_secret", input);
    setSecret(input);
    setAuthed(true);
  }

  function logout() {
    sessionStorage.removeItem("move_admin_secret");
    setSecret("");
    setAuthed(false);
    setInput("");
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-move-dark bg-grain px-6">
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-move-panel p-8"
        >
          <div className="text-center">
            <MoveLogo size="text-3xl" />
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              Painel de administração
            </p>
          </div>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Senha do admin"
            className="mt-6 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-center text-white focus:border-move-yellow focus:outline-none"
          />
          {error && (
            <p className="mt-2 text-center text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-move-yellow px-6 py-3 text-sm font-black uppercase tracking-wider text-black disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "stats", label: "Visão geral" },
    { id: "codes", label: "Códigos" },
    { id: "experiences", label: "Experiências" },
  ];

  return (
    <main className="min-h-screen bg-move-dark bg-grain">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-move-dark/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <MoveLogo size="text-xl" />
            <span className="hidden text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 sm:inline">
              Admin
            </span>
          </div>
          <button
            onClick={logout}
            className="text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-move-yellow"
          >
            Sair
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-5 pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                tab === t.id
                  ? "bg-move-yellow text-black"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        {tab === "stats" && <StatsPanel secret={secret} />}
        {tab === "codes" && <CodesPanel secret={secret} />}
        {tab === "experiences" && <ExperiencesPanel secret={secret} />}
      </div>
    </main>
  );
}
