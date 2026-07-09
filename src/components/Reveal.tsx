"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ScanResult } from "@/lib/types";
import { RARITY_META, TYPE_META } from "@/lib/types";
import { MoveLogo } from "@/components/MoveLogo";

export function Reveal({ result }: { result: ScanResult }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const exp = result.experience;
  const rarity = exp ? RARITY_META[exp.rarity] : RARITY_META.comum;

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 1400);
    return () => clearTimeout(t);
  }, []);

  function copyCode() {
    if (!exp?.reward_code) return;
    navigator.clipboard.writeText(exp.reward_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  if (!exp) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-move-dark bg-grain px-6 text-center">
        <MoveLogo size="text-4xl" />
        <p className="mt-6 text-neutral-300">
          Sua garrafa foi registrada! Novas experiências chegando em breve. 💛
        </p>
        <Link href="/" className="mt-8 text-sm font-bold uppercase text-move-yellow">
          Início
        </Link>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-move-dark bg-grain px-6 py-12 text-center">
      {/* radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 38%, ${rarity.glow} 0%, transparent 55%)`,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <MoveLogo size="text-2xl" className="opacity-90" />

        {!revealed ? (
          /* ---- opening animation ---- */
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
              Descobrindo…
            </p>
          </div>
        ) : (
          /* ---- reveal ---- */
          <div className="mt-10 animate-reveal">
            <span
              className="inline-block rounded-full px-4 py-1 text-[11px] font-black uppercase tracking-[0.2em]"
              style={{
                color: rarity.color,
                border: `1px solid ${rarity.color}`,
                boxShadow: `0 0 24px ${rarity.glow}`,
              }}
            >
              {rarity.label} · {TYPE_META[exp.type].label}
            </span>

            <div className="mt-8 text-7xl drop-shadow-lg">{exp.emoji ?? "🎉"}</div>

            <h1 className="mt-6 font-display text-4xl uppercase leading-none text-white">
              {exp.title}
            </h1>
            {exp.subtitle && (
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-move-yellow">
                {exp.subtitle}
              </p>
            )}
            {exp.description && (
              <p className="mx-auto mt-4 max-w-sm text-neutral-300">
                {exp.description}
              </p>
            )}

            {/* reward code */}
            {exp.reward_code && (
              <button
                onClick={copyCode}
                className="mt-7 w-full rounded-xl border-2 border-dashed border-move-yellow bg-move-yellow/10 px-5 py-4 transition hover:bg-move-yellow/20"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-move-yellow/80">
                  {copied ? "Copiado!" : "Toque pra copiar o código"}
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-white">
                  {exp.reward_code}
                </p>
              </button>
            )}

            {/* content link */}
            {exp.content_url && (
              <a
                href={exp.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block w-full rounded-xl bg-move-yellow px-5 py-4 text-sm font-black uppercase tracking-wider text-black transition hover:brightness-95"
              >
                {exp.reward_label ?? "Acessar agora"} →
              </a>
            )}

            {result.is_first && (
              <p className="mt-6 text-xs text-neutral-500">
                ✨ Você foi o primeiro a escanear esta garrafa!
              </p>
            )}

            <Link
              href="/"
              className="mt-8 inline-block text-xs font-semibold uppercase tracking-wider text-neutral-500 transition hover:text-move-yellow"
            >
              Conheça a MOVE+
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
