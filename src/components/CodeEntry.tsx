"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!clean) return;
    setLoading(true);
    router.push(`/s/${clean}`);
  }

  return (
    <form onSubmit={go} className="flex flex-col gap-3 sm:flex-row">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="SEU CÓDIGO"
        maxLength={16}
        autoCapitalize="characters"
        autoComplete="off"
        className="w-full rounded-xl border border-white/15 bg-move-panel px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-white placeholder:text-neutral-600 focus:border-move-yellow focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-move-yellow px-6 py-3 text-sm font-black uppercase tracking-wider text-black transition hover:brightness-95 disabled:opacity-60"
      >
        {loading ? "…" : "Descobrir"}
      </button>
    </form>
  );
}
