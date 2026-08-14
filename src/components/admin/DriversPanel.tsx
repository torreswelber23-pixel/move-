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
  stock_qty: number;
  month_sales: number;
  total_sales: number;
  cash_sales_month: number;
  cash_amount_month: number;
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

  // consignment: bottle price + deliver stock + log cash sale
  const [bottlePrice, setBottlePrice] = useState("5");
  const [priceSaved, setPriceSaved] = useState(false);

  const [deliverDriver, setDeliverDriver] = useState("");
  const [deliverQty, setDeliverQty] = useState("24");
  const [deliverCooler, setDeliverCooler] = useState("0");
  const [deliverIce, setDeliverIce] = useState("1");
  const [deliverNote, setDeliverNote] = useState("");
  const [delivering, setDelivering] = useState(false);
  const [deliverMsg, setDeliverMsg] = useState("");

  const [cashDriver, setCashDriver] = useState("");
  const [cashQty, setCashQty] = useState("1");
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [loggingCash, setLoggingCash] = useState(false);
  const [cashMsg, setCashMsg] = useState("");

  const supabase = getSupabase();

  const load = useCallback(async () => {
    setLoading(true);
    const [d, s] = await Promise.all([
      supabase.rpc("move_admin_list_drivers", { p_secret: secret }),
      supabase.rpc("move_admin_get_settings", { p_secret: secret }),
    ]);
    setDrivers((d.data as DriverRow[]) ?? []);
    const price = (s.data as { bottle_price?: string })?.bottle_price;
    if (price) setBottlePrice(price);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  useEffect(() => {
    load();
  }, [load]);

  async function savePrice() {
    await supabase.rpc("move_admin_set_setting", {
      p_secret: secret,
      p_key: "bottle_price",
      p_value: bottlePrice,
    });
    setPriceSaved(true);
    setTimeout(() => setPriceSaved(false), 1500);
  }

  async function deliverStock(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(deliverQty);
    const coolers = Number(deliverCooler) || 0;
    const ices = Number(deliverIce) || 0;
    if (!deliverDriver || qty < 0) return;
    if (qty === 0 && coolers === 0 && ices === 0) return;
    setDelivering(true);
    setDeliverMsg("");
    const { data, error } = await supabase.rpc("move_admin_deliver_stock", {
      p_secret: secret,
      p_driver_id: deliverDriver,
      p_quantity: qty,
      p_note: deliverNote || null,
      p_cooler_qty: coolers,
      p_ice_qty: ices,
    });
    setDelivering(false);
    const drv = drivers.find((d) => d.id === deliverDriver);
    if (error) {
      setDeliverMsg("Erro ao entregar estoque.");
      return;
    }
    const kitParts = [
      qty > 0 ? `${qty} garrafa(s)` : null,
      coolers > 0 ? `${coolers} isopor` : null,
      ices > 0 ? `${ices} gelo` : null,
    ].filter(Boolean);
    setDeliverMsg(
      `✓ ${kitParts.join(" + ")} entregue(s) a ${drv?.name ?? "motorista"}. Estoque atual: ${data}.`,
    );
    setDeliverNote("");
    setDeliverCooler("0");
    load();
  }

  async function logCashSale(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(cashQty);
    const amount = Number(cashAmount || Number(bottlePrice) * qty);
    if (!cashDriver || !qty || qty <= 0) return;
    setLoggingCash(true);
    setCashMsg("");
    const { data, error } = await supabase.rpc("move_admin_log_cash_sale", {
      p_secret: secret,
      p_driver_id: cashDriver,
      p_quantity: qty,
      p_amount: amount,
      p_note: cashNote || null,
    });
    setLoggingCash(false);
    const drv = drivers.find((d) => d.id === cashDriver);
    const res = data as { ok: boolean; stock_qty?: number } | null;
    if (error || !res?.ok) {
      setCashMsg("Erro ao registrar venda.");
      return;
    }
    setCashMsg(
      `✓ Venda de ${qty} garrafa(s) (R$${amount}) registrada pra ${drv?.name ?? "motorista"}. Estoque restante: ${res.stock_qty}.`,
    );
    setCashAmount("");
    setCashNote("");
    setCashQty("1");
    load();
  }

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
        Modelo de consignação: entregue um estoque de garrafas ao motorista.
        No acerto (ex: fim de semana), registre o que ele vendeu em dinheiro —
        isso abate o estoque e conta pra comissão e pro nível dele.
      </p>

      {/* bottle price */}
      <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-move-panel p-5">
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Preço da garrafa (R$)
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={bottlePrice}
            onChange={(e) => setBottlePrice(e.target.value)}
            className="mt-1 w-28 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <button
          onClick={savePrice}
          className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-neutral-200 hover:border-move-yellow"
        >
          {priceSaved ? "✓ Salvo" : "Salvar preço"}
        </button>
        <p className="text-xs text-neutral-600">
          Usado como sugestão ao registrar vendas em dinheiro.
        </p>
      </div>

      {/* deliver stock */}
      <form
        onSubmit={deliverStock}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-move-panel p-5"
      >
        <p className="w-full text-xs font-bold uppercase tracking-wide text-neutral-400">
          📦 Entregar kit / estoque
        </p>
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Motorista
          </label>
          <select
            value={deliverDriver}
            onChange={(e) => setDeliverDriver(e.target.value)}
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
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Garrafas
          </label>
          <input
            type="number"
            min="0"
            value={deliverQty}
            onChange={(e) => setDeliverQty(e.target.value)}
            className="mt-1 w-24 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Isopor
          </label>
          <input
            type="number"
            min="0"
            value={deliverCooler}
            onChange={(e) => setDeliverCooler(e.target.value)}
            className="mt-1 w-20 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Gelo
          </label>
          <input
            type="number"
            min="0"
            value={deliverIce}
            onChange={(e) => setDeliverIce(e.target.value)}
            className="mt-1 w-20 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Nota (opcional)
          </label>
          <input
            value={deliverNote}
            onChange={(e) => setDeliverNote(e.target.value)}
            placeholder="ex: entrega 10/07"
            className="mt-1 w-40 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={delivering || !deliverDriver}
          className="rounded-lg bg-move-yellow px-5 py-2.5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-50"
        >
          {delivering ? "Entregando…" : "Entregar"}
        </button>
        {deliverMsg && <p className="w-full text-sm text-move-yellow">{deliverMsg}</p>}
      </form>

      {/* log cash sale */}
      <form
        onSubmit={logCashSale}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-move-panel p-5"
      >
        <p className="w-full text-xs font-bold uppercase tracking-wide text-neutral-400">
          💵 Registrar venda em dinheiro (acerto)
        </p>
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Motorista
          </label>
          <select
            value={cashDriver}
            onChange={(e) => setCashDriver(e.target.value)}
            className="mt-1 w-52 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          >
            <option value="">Selecione…</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · estoque: {d.stock_qty}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Quantidade
          </label>
          <input
            type="number"
            min="1"
            value={cashQty}
            onChange={(e) => setCashQty(e.target.value)}
            className="mt-1 w-20 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Valor total (R$)
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            placeholder={String(Number(bottlePrice) * Number(cashQty || 1))}
            className="mt-1 w-28 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-neutral-500">
            Nota (opcional)
          </label>
          <input
            value={cashNote}
            onChange={(e) => setCashNote(e.target.value)}
            placeholder="ex: acerto sábado"
            className="mt-1 w-40 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loggingCash || !cashDriver || !cashQty}
          className="rounded-lg bg-move-yellow px-5 py-2.5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-50"
        >
          {loggingCash ? "Registrando…" : "Registrar venda"}
        </button>
        {cashMsg && <p className="w-full text-sm text-move-yellow">{cashMsg}</p>}
      </form>

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
              <th className="px-4 py-2">Estoque</th>
              <th className="px-4 py-2">Mês</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Dinheiro (mês)</th>
              <th className="px-4 py-2">Indicado por</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-5 text-neutral-500">
                  Carregando…
                </td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-5 text-neutral-500">
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
                    <td className="px-4 py-2 font-bold text-white">{d.stock_qty}</td>
                    <td className="px-4 py-2 font-bold text-move-yellow">{d.month_sales}</td>
                    <td className="px-4 py-2 text-neutral-300">{d.total_sales}</td>
                    <td className="px-4 py-2 text-neutral-400">
                      {d.cash_sales_month > 0
                        ? `${d.cash_sales_month} · R$${d.cash_amount_month}`
                        : "—"}
                    </td>
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
