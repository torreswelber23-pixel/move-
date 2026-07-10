"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface DriverRow {
  id: string;
  name: string;
  phone: string;
  pix_key: string | null;
  city: string | null;
  status: string;
  referral_code: string;
  referred_by_name: string | null;
  month_sales: number;
  total_sales: number;
  assigned_bottles: number;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-neutral-800 text-neutral-300" },
  active: { label: "Ativo", cls: "bg-move-yellow/20 text-move-yellow" },
  blocked: { label: "Bloqueado", cls: "bg-red-500/20 text-red-400" },
};

export function DriversPanel({ secret }: { secret: string }) {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignBatch, setAssignBatch] = useState("");
  const [assignDriver, setAssignDriver] = useState("");
  const [assignMsg, setAssignMsg] = useState("");
  const [assigning, setAssigning] = useState(false);

  const supabase = getSupabase();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("move_admin_list_drivers", {
      p_secret: secret,
    });
    setDrivers((data as DriverRow[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    await supabase.rpc("move_admin_set_driver_status", {
      p_secret: secret,
      p_driver_id: id,
      p_status: status,
    });
    load();
  }

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignBatch || !assignDriver) return;
    setAssigning(true);
    setAssignMsg("");
    const { data, error } = await supabase.rpc("move_admin_assign_batch", {
      p_secret: secret,
      p_batch: assignBatch,
      p_driver_id: assignDriver,
    });
    setAssigning(false);
    if (error) {
      setAssignMsg("Erro ao atribuir lote.");
      return;
    }
    const count = data as number;
    const drv = drivers.find((d) => d.id === assignDriver);
    setAssignMsg(
      count > 0
        ? `✓ ${count} garrafa(s) do lote "${assignBatch}" atribuída(s) a ${drv?.name ?? "motorista"}.`
        : `Nenhuma garrafa encontrada no lote "${assignBatch}".`,
    );
    setAssignBatch("");
    load();
  }

  const monthLeaders = [...drivers]
    .filter((d) => d.month_sales > 0)
    .sort((a, b) => b.month_sales - a.month_sales)
    .slice(0, 5);

  return (
    <div>
      <h2 className="font-display text-2xl uppercase text-white">Motoristas</h2>
      <p className="mt-2 text-sm text-neutral-400">
        A venda é contada quando uma garrafa do lote do motorista é escaneada
        pela primeira vez. Atribua os lotes abaixo.
      </p>

      {/* assign batch */}
      <form
        onSubmit={assign}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-move-panel p-5"
      >
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Lote (batch)
          </label>
          <input
            value={assignBatch}
            onChange={(e) => setAssignBatch(e.target.value)}
            placeholder="ex: folha-01"
            className="mt-1 w-44 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Motorista
          </label>
          <select
            value={assignDriver}
            onChange={(e) => setAssignDriver(e.target.value)}
            className="mt-1 w-52 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          >
            <option value="">Selecione…</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.phone})
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={assigning || !assignBatch || !assignDriver}
          className="rounded-lg bg-move-yellow px-5 py-2.5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-50"
        >
          {assigning ? "Atribuindo…" : "Atribuir lote"}
        </button>
        {assignMsg && (
          <p className="w-full text-sm text-move-yellow">{assignMsg}</p>
        )}
      </form>

      {/* month leaders */}
      {monthLeaders.length > 0 && (
        <div className="mt-5 rounded-2xl border border-move-yellow/40 bg-move-yellow/5 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-move-yellow">
            🏆 Top do mês
          </p>
          <ol className="mt-2 space-y-1">
            {monthLeaders.map((d, i) => (
              <li key={d.id} className="flex justify-between text-sm text-white">
                <span>
                  <b className="mr-2 text-neutral-500">#{i + 1}</b>
                  {d.name}
                </span>
                <b className="text-move-yellow">{d.month_sales} vendas</b>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* drivers table */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Motorista</th>
              <th className="px-4 py-2">WhatsApp</th>
              <th className="px-4 py-2">PIX</th>
              <th className="px-4 py-2">Mês</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Garrafas</th>
              <th className="px-4 py-2">Indicado por</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-5 text-neutral-500">
                  Carregando…
                </td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-5 text-neutral-500">
                  Nenhum motorista ainda. Divulgue o link /motorista.
                </td>
              </tr>
            ) : (
              drivers.map((d) => {
                const st = STATUS_META[d.status] ?? STATUS_META.pending;
                return (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="px-4 py-2 text-white">
                      {d.name}
                      <span className="ml-2 font-mono text-[10px] text-neutral-500">
                        {d.referral_code}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-neutral-300">{d.phone}</td>
                    <td className="px-4 py-2 text-neutral-400">{d.pix_key ?? "—"}</td>
                    <td className="px-4 py-2 font-bold text-move-yellow">{d.month_sales}</td>
                    <td className="px-4 py-2 text-neutral-300">{d.total_sales}</td>
                    <td className="px-4 py-2 text-neutral-400">{d.assigned_bottles}</td>
                    <td className="px-4 py-2 text-neutral-400">{d.referred_by_name ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {d.status !== "active" && (
                        <button
                          onClick={() => setStatus(d.id, "active")}
                          className="mr-2 text-xs font-bold text-move-yellow hover:underline"
                        >
                          Ativar
                        </button>
                      )}
                      {d.status !== "blocked" ? (
                        <button
                          onClick={() => setStatus(d.id, "blocked")}
                          className="text-xs font-semibold text-red-400/70 hover:text-red-400"
                        >
                          Bloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatus(d.id, "active")}
                          className="text-xs font-semibold text-neutral-400 hover:text-white"
                        >
                          Desbloquear
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
