import Link from "next/link";
import { headers } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import type { CheckResult } from "@/lib/types";
import { BrandLogo } from "@/components/BrandLogo";
import { RaffleEntry } from "@/components/RaffleEntry";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const ua = h.get("user-agent") || null;

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("move_check_bottle", {
    p_code: code,
    p_ip: ip,
    p_user_agent: ua,
  });

  const result = (data ?? { ok: false }) as CheckResult;

  if (error || !result.ok) {
    const reason =
      result.error === "disabled"
        ? "Este código foi desativado."
        : "Código não encontrado. Confira as letras do rótulo.";
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-move-dark bg-grain px-6 text-center">
        <BrandLogo size="text-4xl" />
        <div className="mt-8 text-5xl">🤔</div>
        <h1 className="mt-4 font-display text-3xl uppercase text-white">Ops!</h1>
        <p className="mt-2 max-w-sm text-neutral-400">{reason}</p>
        <p className="mt-1 font-mono text-sm text-neutral-600">
          {code?.toUpperCase()}
        </p>
        <Link
          href="/"
          className="mt-8 rounded-xl bg-move-yellow px-6 py-3 text-sm font-black uppercase tracking-wider text-black"
        >
          Voltar
        </Link>
      </main>
    );
  }

  return <RaffleEntry code={result.code!} check={result} />;
}
