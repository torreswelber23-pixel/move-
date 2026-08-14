"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/BrandLogo";

interface LevelInfo {
  level: string;
  emoji: string;
  rate: number;
  bonus: number;
  earnings: number;
  next_level: string | null;
  next_target: number | null;
}

interface Dashboard {
  ok: boolean;
  error?: string;
  name?: string;
  status?: string;
  referral_code?: string;
  stock_qty?: number;
  bottle_price?: string;
  month_sales?: number;
  total_sales?: number;
  position?: number;
  referrals?: number;
  referral_bonus?: string;
  level?: LevelInfo;
  ranking?: { name: string; sales: number; emoji: string }[];
}

const LEVELS = [
  { emoji: "🥉", name: "Bronze", req: "Entrou na rede", perk: "R$1,00 por garrafa" },
  { emoji: "🥈", name: "Prata", req: "300 garrafas/mês", perk: "Bônus de R$200" },
  { emoji: "🥇", name: "Ouro", req: "600 garrafas/mês", perk: "R$1,20 por garrafa + kit" },
  { emoji: "💎", name: "Diamante", req: "1.000 garrafas/mês", perk: "R$1,50 por garrafa + bônus" },
];

const inputCls =
  "w-full rounded-xl border border-white/15 bg-move-panel px-4 py-3 text-white placeholder:text-neutral-600 focus:border-move-yellow focus:outline-none";

export function DriverPortal() {
  const [view, setView] = useState<"landing" | "register" | "login" | "dash">("landing");
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // register form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pix, setPix] = useState("");
  const [city, setCity] = useState("");
  const [refCode, setRefCode] = useState("");
  const [newAccess, setNewAccess] = useState("");

  // login form
  const [loginPhone, setLoginPhone] = useState("");
  const [loginAccess, setLoginAccess] = useState("");

  const loadDash = useCallback(async (p: string, a: string) => {
    setLoading(true);
    setError("");
    const supabase = getSupabase();
    const { data } = await supabase.rpc("move_driver_dashboard", {
      p_phone: p,
      p_access: a,
    });
    setLoading(false);
    const res = (data ?? { ok: false }) as Dashboard;
    if (!res.ok) {
      setError("Telefone ou código de acesso incorretos.");
      return false;
    }
    setDash(res);
    localStorage.setItem("move_driver", JSON.stringify({ p, a }));
    setView("dash");
    return true;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("move_driver");
    if (saved) {
      try {
        const { p, a } = JSON.parse(saved);
        loadDash(p, a);
      } catch {
        /* ignore */
      }
    }
  }, [loadDash]);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Digite seu nome.");
    if (phone.replace(/\D/g, "").length < 10) return setError("WhatsApp inválido.");
    setLoading(true);
    const supabase = getSupabase();
    const { data } = await supabase.rpc("move_driver_register", {
      p_name: name,
      p_phone: phone,
      p_pix: pix || null,
      p_city: city || null,
      p_vehicle: null,
      p_ref_code: refCode || null,
    });
    setLoading(false);
    const res = data as { ok: boolean; error?: string; access_code?: string };
    if (!res?.ok) {
      setError(
        res?.error === "phone_exists"
          ? "Esse WhatsApp já está cadastrado. Use o login."
          : "Não foi possível cadastrar. Confira os dados.",
      );
      return;
    }
    setNewAccess(res.access_code!);
    await loadDash(phone, res.access_code!);
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    await loadDash(loginPhone, loginAccess);
  }

  function logout() {
    localStorage.removeItem("move_driver");
    setDash(null);
    setView("landing");
  }

  function shareReferral() {
    if (!dash?.referral_code) return;
    const msg = encodeURIComponent(
      `🚗💧 Vem ser motorista parceiro Água Premiada! Você ganha por cada garrafa vendida e sobe de nível. Cadastre-se com o meu código: ${dash.referral_code} → ${window.location.origin}/motorista`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  /* ---------------- dashboard ---------------- */
  if (view === "dash" && dash?.ok) {
    const lv = dash.level!;
    const progress = lv.next_target
      ? Math.min(100, ((dash.month_sales ?? 0) / lv.next_target) * 100)
      : 100;
    return (
      <main className="min-h-screen bg-move-dark bg-grain px-5 py-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <BrandLogo size="text-xl" />
            <button
              onClick={logout}
              className="text-xs font-semibold uppercase text-neutral-500 hover:text-move-yellow"
            >
              Sair
            </button>
          </div>

          <p className="mt-6 text-sm text-neutral-400">Olá, motorista</p>
          <h1 className="font-display text-3xl uppercase text-white">{dash.name}</h1>
          {dash.status === "pending" && (
            <p className="mt-2 rounded-lg border border-move-yellow/40 bg-move-yellow/10 px-3 py-2 text-xs text-move-yellow">
              ⏳ Cadastro em análise — você já pode acompanhar tudo por aqui.
            </p>
          )}

          {newAccess && (
            <div className="mt-4 rounded-xl border-2 border-dashed border-move-yellow bg-move-yellow/10 p-4 text-center">
              <p className="text-xs font-bold uppercase text-move-yellow">
                ⚠️ Guarde seu código de acesso
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-white">
                {newAccess}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                É com ele + seu WhatsApp que você entra no painel.
              </p>
            </div>
          )}

          {/* level card */}
          <div className="mt-5 rounded-2xl border border-move-yellow/40 bg-move-yellow/5 p-5 text-center">
            <div className="text-5xl">{lv.emoji}</div>
            <p className="mt-1 font-display text-3xl uppercase text-move-yellow">
              Nível {lv.level}
            </p>
            <p className="text-xs text-neutral-400">
              R${lv.rate.toFixed(2).replace(".", ",")} por garrafa
              {lv.bonus > 0 && ` · bônus de R$${lv.bonus}`}
            </p>

            {lv.next_target ? (
              <div className="mt-4">
                <div className="h-3 overflow-hidden rounded-full bg-black/50">
                  <div
                    className="h-full rounded-full bg-move-yellow transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-300">
                  <b className="text-white">{dash.month_sales}</b> de{" "}
                  <b className="text-white">{lv.next_target}</b> garrafas pra virar{" "}
                  <b className="text-move-yellow">{lv.next_level}</b>
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs font-bold text-move-yellow">
                👑 Você está no topo!
              </p>
            )}
          </div>

          {/* stats */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Stat label="Estoque" value={String(dash.stock_qty ?? 0)} />
            <Stat label="Vendas no mês" value={String(dash.month_sales ?? 0)} />
            <Stat
              label="Ganhos do mês"
              value={`R$${Number(lv.earnings).toFixed(0)}`}
              hero
            />
            <Stat label="Posição" value={`#${dash.position ?? "—"}`} />
          </div>
          {(dash.stock_qty ?? 0) === 0 && (
            <p className="mt-2 text-center text-xs text-neutral-500">
              Sem estoque no momento — fale com a Água Premiada pra pegar mais garrafas.
            </p>
          )}

          {/* referral */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-move-panel p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
              🤝 Indique e ganhe
            </p>
            <p className="mt-1 text-sm text-neutral-300">
              Traga outro motorista pra rede e ganhe{" "}
              <b className="text-move-yellow">R${dash.referral_bonus}</b> quando ele
              ativar. Você já tem{" "}
              <b className="text-move-yellow">{dash.referrals}</b> indicação(ões) ativa(s).
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.3em] text-move-yellow">
                {dash.referral_code}
              </span>
              <button
                onClick={shareReferral}
                className="rounded-lg bg-[#25D366] px-4 py-2.5 text-xs font-black uppercase text-black"
              >
                Compartilhar
              </button>
            </div>
          </div>

          {/* ranking */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-move-panel p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
              🏆 Ranking do mês
            </p>
            {(dash.ranking?.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">
                Ninguém pontuou ainda — seja o primeiro!
              </p>
            ) : (
              <ol className="mt-2 space-y-1.5">
                {dash.ranking!.map((r, i) => (
                  <li
                    key={i}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      r.name === dash.name
                        ? "bg-move-yellow/15 text-move-yellow"
                        : "text-neutral-300"
                    }`}
                  >
                    <span>
                      <b className="mr-2 text-neutral-500">#{i + 1}</b>
                      {r.emoji} {r.name}
                    </span>
                    <b>{r.sales}</b>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* levels table */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-move-panel p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
              📈 Sua carreira Água Premiada
            </p>
            <div className="mt-2 space-y-2">
              {LEVELS.map((l) => (
                <div
                  key={l.name}
                  className={`flex items-start gap-3 rounded-lg px-3 py-2 ${
                    l.name === lv.level ? "bg-move-yellow/15" : ""
                  }`}
                >
                  <span className="text-xl">{l.emoji}</span>
                  <div>
                    <p className={`text-sm font-bold ${l.name === lv.level ? "text-move-yellow" : "text-white"}`}>
                      {l.name} <span className="font-normal text-neutral-500">· {l.req}</span>
                    </p>
                    <p className="text-xs text-neutral-400">{l.perk}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------- landing / register / login ---------------- */
  return (
    <main className="min-h-screen bg-move-dark bg-grain px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <BrandLogo size="text-xl" />
          <Link
            href="/"
            className="text-xs font-semibold uppercase text-neutral-500 hover:text-move-yellow"
          >
            Início
          </Link>
        </div>

        {view === "landing" && (
          <div className="mt-10 text-center">
            <div className="text-6xl">🚗💧</div>
            <h1 className="mt-4 font-display text-4xl uppercase leading-none text-white">
              Motorista <span className="text-move-yellow">parceiro</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-neutral-300">
              Venda Água Premiada no seu carro, ganhe por garrafa e{" "}
              <b className="text-move-yellow">suba de nível</b>. Quanto mais você
              vende, mais você ganha.
            </p>

            <div className="mt-8 space-y-2 text-left">
              {LEVELS.map((l) => (
                <div
                  key={l.name}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-move-panel px-4 py-3"
                >
                  <span className="text-2xl">{l.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {l.name}{" "}
                      <span className="font-normal text-neutral-500">· {l.req}</span>
                    </p>
                    <p className="text-xs text-move-yellow">{l.perk}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setView("register")}
              className="mt-8 w-full rounded-xl bg-move-yellow px-6 py-4 text-base font-black uppercase tracking-wider text-black"
            >
              Quero entrar na rede 🚀
            </button>
            <button
              onClick={() => setView("login")}
              className="mt-3 w-full rounded-xl border border-white/15 px-6 py-3 text-sm font-bold uppercase text-neutral-300"
            >
              Já sou parceiro — entrar
            </button>
          </div>
        )}

        {view === "register" && (
          <form onSubmit={register} className="mt-8">
            <h1 className="font-display text-3xl uppercase text-white">
              Cadastro de <span className="text-move-yellow">motorista</span>
            </h1>
            <div className="mt-5 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" className={inputCls} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="WhatsApp com DDD" className={inputCls} />
              <input value={pix} onChange={(e) => setPix(e.target.value)} placeholder="Chave PIX (pra receber)" className={inputCls} />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" className={inputCls} />
              <input value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} placeholder="Código de indicação (opcional)" className={`${inputCls} font-mono uppercase`} />
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-move-yellow px-6 py-4 text-base font-black uppercase tracking-wider text-black disabled:opacity-60"
            >
              {loading ? "Cadastrando…" : "Entrar na rede 🥉"}
            </button>
            <button
              type="button"
              onClick={() => { setView("landing"); setError(""); }}
              className="mt-3 w-full text-center text-xs font-semibold uppercase text-neutral-500"
            >
              Voltar
            </button>
          </form>
        )}

        {view === "login" && (
          <form onSubmit={login} className="mt-8">
            <h1 className="font-display text-3xl uppercase text-white">
              Entrar no <span className="text-move-yellow">painel</span>
            </h1>
            <div className="mt-5 space-y-3">
              <input value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} inputMode="tel" placeholder="WhatsApp com DDD" className={inputCls} />
              <input value={loginAccess} onChange={(e) => setLoginAccess(e.target.value.toUpperCase())} placeholder="Código de acesso" className={`${inputCls} text-center font-mono uppercase tracking-[0.3em]`} />
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-move-yellow px-6 py-4 text-base font-black uppercase tracking-wider text-black disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => { setView("landing"); setError(""); }}
              className="mt-3 w-full text-center text-xs font-semibold uppercase text-neutral-500"
            >
              Voltar
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, hero = false }: { label: string; value: string; hero?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-3 text-center ${
        hero ? "border-move-yellow/50 bg-move-yellow/10" : "border-white/10 bg-move-panel"
      }`}
    >
      <p className="font-display text-2xl text-move-yellow">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
    </div>
  );
}
