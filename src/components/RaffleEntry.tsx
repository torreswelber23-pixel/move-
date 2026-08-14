"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { CheckResult, RegisterResult } from "@/lib/types";
import { BrandLogo } from "@/components/BrandLogo";

type Stage = "opening" | "form" | "done" | "already" | "closed" | "expired";

export function RaffleEntry({
  code,
  check,
}: {
  code: string;
  check: CheckResult;
}) {
  const initial: Stage =
    check.state === "expired"
      ? "expired"
      : check.state === "registered" || check.already_registered
        ? "already"
        : !check.raffle_open
          ? "closed"
          : "form";

  const [stage, setStage] = useState<Stage>("opening");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const prize = check.prize_label || "R$100";
  const waLink = check.whatsapp_group_link || "";
  const buyLink = check.where_to_buy || "";

  useEffect(() => {
    const t = setTimeout(() => setStage(initial), 1600);
    return () => clearTimeout(t);
  }, [initial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Digite seu nome.");
    if (phone.replace(/\D/g, "").length < 10)
      return setError("Digite um WhatsApp válido com DDD.");
    setLoading(true);
    const supabase = getSupabase();
    const { data, error: err } = await supabase.rpc("move_register_entry", {
      p_code: code,
      p_name: name,
      p_phone: phone,
    });
    setLoading(false);
    const res = (data ?? { ok: false }) as RegisterResult;
    if (err || !res.ok) {
      if (res.error === "expired") return setStage("expired");
      setError(
        res.error === "closed"
          ? "O sorteio foi encerrado."
          : res.error === "invalid_phone"
            ? "WhatsApp inválido."
            : "Não foi possível cadastrar. Tente de novo.",
      );
      return;
    }
    setStage("done");
  }

  // CTA to buy a bottle (shown on expired / closed screens)
  const BuyCta = () =>
    buyLink ? (
      <a
        href={buyLink.startsWith("http") ? buyLink : `https://${buyLink}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-7 block w-full rounded-xl bg-move-yellow px-6 py-4 text-base font-black uppercase tracking-wider text-black transition hover:brightness-95"
      >
        Quero comprar uma garrafa 💧
      </a>
    ) : (
      <p className="mt-7 rounded-xl border border-white/10 bg-move-panel px-4 py-3 text-sm text-neutral-400">
        Compre uma garrafa Água Premiada e escaneie um novo código pra participar.
      </p>
    );

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-move-dark bg-grain px-6 py-12 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, rgba(245,211,10,0.28) 0%, transparent 58%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <BrandLogo size="text-2xl" className="opacity-90" />

        {stage === "opening" && (
          <div className="mt-24 flex flex-col items-center">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <span className="absolute h-full w-full rounded-full border-2 border-move-yellow animate-pulse-ring" />
              <span
                className="absolute h-full w-full rounded-full border-2 border-move-yellow animate-pulse-ring"
                style={{ animationDelay: "0.6s" }}
              />
              <span className="text-5xl">💧</span>
            </div>
            <p className="mt-8 animate-pulse font-display text-xl uppercase tracking-widest text-move-yellow">
              Abrindo…
            </p>
          </div>
        )}

        {stage === "form" && (
          <form onSubmit={submit} className="mt-8 animate-reveal">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-move-yellow">
              Código válido · {code}
            </p>
            <h1 className="mt-4 font-display text-5xl uppercase leading-[0.95] text-white">
              Você está <span className="shine">concorrendo</span> a
            </h1>
            <p className="mt-2 font-display text-6xl text-move-yellow drop-shadow">
              {prize}
            </p>
            <p className="mx-auto mt-4 max-w-xs text-neutral-300">
              Cadastre-se pra entrar no sorteio. No final, sorteamos um ganhador
              ao vivo no grupo. 💛
            </p>
            {check.ttl_minutes && check.ttl_minutes > 0 && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-move-yellow/80">
                ⏳ Este código vale por {check.ttl_minutes} min. Corre!
              </p>
            )}

            <div className="mt-7 space-y-3 text-left">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-xl border border-white/15 bg-move-panel px-4 py-3 text-white placeholder:text-neutral-600 focus:border-move-yellow focus:outline-none"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="WhatsApp com DDD"
                className="w-full rounded-xl border border-white/15 bg-move-panel px-4 py-3 text-white placeholder:text-neutral-600 focus:border-move-yellow focus:outline-none"
              />
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-move-yellow px-6 py-4 text-base font-black uppercase tracking-wider text-black transition hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Quero concorrer 🎉"}
            </button>
            <p className="mt-3 text-xs text-neutral-600">
              Cada garrafa dá direito a uma participação.
            </p>
          </form>
        )}

        {(stage === "done" || stage === "already") && (
          <div className="mt-10 animate-reveal">
            <div className="text-7xl">🎉</div>
            <h1 className="mt-5 font-display text-4xl uppercase leading-none text-white">
              {stage === "already" ? "Você já está na disputa!" : "Boa sorte!"}
            </h1>
            <p className="mx-auto mt-4 max-w-xs text-neutral-300">
              Você está concorrendo a{" "}
              <span className="font-bold text-move-yellow">{prize}</span>. O
              ganhador será sorteado no grupo — entra lá pra não perder!
            </p>

            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 block w-full rounded-xl bg-[#25D366] px-6 py-4 text-base font-black uppercase tracking-wider text-black transition hover:brightness-95"
              >
                Entrar no grupo do WhatsApp
              </a>
            ) : (
              <p className="mt-7 rounded-xl border border-white/10 bg-move-panel px-4 py-3 text-sm text-neutral-400">
                Fique de olho: em breve o link do grupo do sorteio.
              </p>
            )}

            <Link
              href="/"
              className="mt-6 inline-block text-xs font-semibold uppercase tracking-wider text-neutral-500 transition hover:text-move-yellow"
            >
              Conheça a Água Premiada
            </Link>
          </div>
        )}

        {stage === "expired" && (
          <div className="mt-14 animate-reveal">
            <div className="text-6xl">⏳</div>
            <h1 className="mt-5 font-display text-4xl uppercase leading-none text-white">
              Esse código já era!
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-neutral-300">
              Este código já foi resgatado ou passou da validade. Quer saber o
              que tinha aqui e concorrer a{" "}
              <span className="font-bold text-move-yellow">{prize}</span>?
            </p>
            <BuyCta />
            <Link
              href="/"
              className="mt-6 inline-block text-xs font-semibold uppercase tracking-wider text-neutral-500 transition hover:text-move-yellow"
            >
              Conheça a Água Premiada
            </Link>
          </div>
        )}

        {stage === "closed" && (
          <div className="mt-16 animate-reveal">
            <div className="text-6xl">🏁</div>
            <h1 className="mt-5 font-display text-3xl uppercase text-white">
              Sorteio encerrado
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-neutral-400">
              Este sorteio já foi finalizado. Fique ligado nos próximos drops da
              Água Premiada!
            </p>
            <BuyCta />
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-neutral-300"
            >
              Início
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
