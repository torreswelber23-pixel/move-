"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface Costs {
  bottle_price: number;
  cost_water: number;
  cost_label: number;
  cost_cooler: number;
  cost_ice: number;
  kit_bottles: number;
}

interface Totals {
  drivers_count: number;
  active_count: number;
  invested: number;
  bottles_in: number;
  stock_qty: number;
  stock_value: number;
  sold: number;
  revenue: number;
  commission: number;
  cogs_sold: number;
  ice_cost: number;
  cooler_cost: number;
  gross_profit: number;
  net_profit: number;
  paid_back_count: number;
}

interface DriverEcon {
  id: string;
  name: string;
  phone: string;
  status: string;
  level: string;
  emoji: string;
  stock_qty: number;
  bottles_in: number;
  coolers: number;
  ices: number;
  sold: number;
  sold_month: number;
  rate: number;
  margin_per_bottle: number;
  invested: number;
  cooler_cost: number;
  ice_cost: number;
  goods_cost: number;
  stock_value: number;
  revenue: number;
  commission: number;
  cogs_sold: number;
  gross_profit: number;
  net_profit: number;
  payback_pct: number;
  paid_back: boolean;
  days_active: number | null;
}

interface Econ {
  ok: boolean;
  costs: Costs;
  totals: Totals;
  drivers: DriverEcon[];
}

const COST_FIELDS: { key: keyof Costs; label: string; hint: string }[] = [
  { key: "bottle_price", label: "Venda (R$)", hint: "preço por garrafa" },
  { key: "cost_water", label: "Água (R$)", hint: "custo por garrafa" },
  { key: "cost_label", label: "Etiqueta (R$)", hint: "custo por garrafa" },
  { key: "cost_cooler", label: "Isopor (R$)", hint: "ativo reutilizável" },
  { key: "cost_ice", label: "Gelo (R$)", hint: "consumível por recarga" },
  { key: "kit_bottles", label: "Garrafas/kit", hint: "tamanho do lote" },
];

const SETTING_KEY: Record<keyof Costs, string> = {
  bottle_price: "bottle_price",
  cost_water: "cost_water",
  cost_label: "cost_label",
  cost_cooler: "cost_cooler",
  cost_ice: "cost_ice",
  kit_bottles: "kit_bottles",
};

const money = (n: number) =>
  `R$${Number(n || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const money0 = (n: number) =>
  `R$${Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

export function EconomicsPanel({ secret }: { secret: string }) {
  const [econ, setEcon] = useState<Econ | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    const { data } = await supabase.rpc("move_admin_unit_economics", {
      p_secret: secret,
    });
    const res = data as Econ | null;
    if (res?.ok) {
      setEcon(res);
      setDraft(
        Object.fromEntries(
          Object.entries(res.costs).map(([k, v]) => [k, String(v)]),
        ),
      );
    }
    setLoading(false);
  }, [secret]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveCosts() {
    if (!econ) return;
    setSaving(true);
    const supabase = getSupabase();
    for (const f of COST_FIELDS) {
      const val = draft[f.key];
      if (val === undefined || val === "") continue;
      if (Number(val) === Number(econ.costs[f.key])) continue;
      await supabase.rpc("move_admin_set_setting", {
        p_secret: secret,
        p_key: SETTING_KEY[f.key],
        p_value: String(Number(val)),
      });
    }
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
    load();
  }

  if (loading || !econ) {
    return <p className="text-neutral-500">Carregando…</p>;
  }

  const c = econ.costs;
  const t = econ.totals;

  /* ---- model for ONE kit (the franchise unit) ---- */
  const kit = Number(c.kit_bottles) || 24;
  const perBottleCost = Number(c.cost_water) + Number(c.cost_label);
  const baseRate = 1; // Bronze — comissão de entrada
  const marginBottle = Number(c.bottle_price) - baseRate - perBottleCost;

  const kitInvest =
    Number(c.cost_cooler) + Number(c.cost_ice) + kit * perBottleCost;
  const kitRevenue = kit * Number(c.bottle_price);
  const kitCommission = kit * baseRate;
  const kitWater = kit * Number(c.cost_water);
  const kitLabels = kit * Number(c.cost_label);
  const kitGross = kitRevenue - kitCommission - kitWater - kitLabels;
  const kitNet = kitGross - Number(c.cost_ice);

  const SCALE = [1, 10, 50, 100];

  return (
    <div>
      <h2 className="font-display text-2xl uppercase text-white">
        Economia da rede
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        Cada motorista é uma mini unidade de negócio: investimento → estoque →
        vendas → comissão → seu lucro → retorno. Ajuste os custos abaixo e tudo
        se recalcula.
      </p>

      {/* cost editor */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-move-panel p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
          ⚙️ Custos e preço
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COST_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="block text-[10px] font-semibold uppercase text-neutral-500">
                {f.label}
              </span>
              <input
                type="number"
                step="0.05"
                min="0"
                value={draft[f.key] ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none"
              />
              <span className="mt-0.5 block text-[10px] text-neutral-600">
                {f.hint}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={saveCosts}
            disabled={saving}
            className="rounded-lg bg-move-yellow px-5 py-2 text-xs font-black uppercase tracking-wider text-black disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar custos"}
          </button>
          {savedFlash && (
            <span className="text-xs font-bold text-move-yellow">✓ salvo</span>
          )}
        </div>
      </div>

      {/* the unit model */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-move-yellow/40 bg-move-yellow/5 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-move-yellow">
            📦 Modelo de 1 kit ({kit} garrafas)
          </p>
          <div className="mt-4 space-y-1.5 text-sm">
            <Line
              label={`Investimento (isopor ${money0(c.cost_cooler)} + gelo ${money0(c.cost_ice)} + ${kit} águas + ${kit} etiquetas)`}
              value={money(kitInvest)}
              muted
            />
            <div className="my-3 border-t border-white/10" />
            <Line label={`Faturamento (${kit} × ${money(c.bottle_price)})`} value={money(kitRevenue)} strong />
            <Line label={`− Comissão motorista (${kit} × ${money(baseRate)})`} value={`−${money(kitCommission)}`} />
            <Line label={`− Custo da água (${kit} × ${money(c.cost_water)})`} value={`−${money(kitWater)}`} />
            <Line label={`− Etiquetas (${kit} × ${money(c.cost_label)})`} value={`−${money(kitLabels)}`} />
            <div className="my-3 border-t border-white/10" />
            <Line label="Margem bruta" value={money(kitGross)} strong highlight />
            <Line label={`− Gelo (consumível)`} value={`−${money(c.cost_ice)}`} />
            <Line label="Resultado do ciclo" value={money(kitNet)} strong highlight />
          </div>
          <p className="mt-4 rounded-lg bg-black/30 px-3 py-2 text-xs text-neutral-400">
            O isopor de {money0(c.cost_cooler)} continua sendo seu{" "}
            <b className="text-neutral-200">ativo</b> para os próximos ciclos — só
            entra no primeiro investimento.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-move-panel p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            💰 Margem por garrafa
          </p>
          <p className="mt-2 font-display text-5xl text-move-yellow">
            {money(marginBottle)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {money(c.bottle_price)} − {money(baseRate)} comissão −{" "}
            {money(c.cost_water)} água − {money(c.cost_label)} etiqueta
          </p>

          <p className="mt-6 text-xs font-bold uppercase tracking-wide text-neutral-400">
            📈 Potencial por semana
          </p>
          <p className="mt-1 text-[11px] text-neutral-600">
            se cada motorista girar 1 kit/semana
          </p>
          <div className="mt-3 space-y-2">
            {SCALE.map((n) => (
              <div
                key={n}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              >
                <span className="text-sm text-neutral-300">
                  {n} motorista{n > 1 ? "s" : ""}
                </span>
                <b className="font-display text-lg text-move-yellow">
                  {money0(kitGross * n)}
                </b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* real network numbers */}
      <h3 className="mt-10 text-sm font-bold uppercase tracking-wide text-neutral-400">
        Números reais da rede
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card label="Investido" value={money0(t.invested)} />
        <Card label="Faturamento" value={money0(t.revenue)} />
        <Card label="Comissões" value={money0(t.commission)} />
        <Card label="Custo produto" value={money0(t.cogs_sold)} />
        <Card label="Seu lucro" value={money0(t.net_profit)} hero />
        <Card label="Estoque na rua" value={`${t.stock_qty}`} sub={money0(t.stock_value)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Motoristas" value={`${t.drivers_count}`} sub={`${t.active_count} ativos`} />
        <Card label="Garrafas entregues" value={`${t.bottles_in}`} />
        <Card label="Garrafas vendidas" value={`${t.sold}`} />
        <Card label="Já se pagaram" value={`${t.paid_back_count}`} sub="kits no lucro" />
      </div>

      {/* per driver */}
      <h3 className="mt-10 text-sm font-bold uppercase tracking-wide text-neutral-400">
        Por motorista
      </h3>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Motorista</th>
              <th className="px-4 py-2">Investido</th>
              <th className="px-4 py-2">Estoque</th>
              <th className="px-4 py-2">Vendidas</th>
              <th className="px-4 py-2">Faturou</th>
              <th className="px-4 py-2">Ganhou</th>
              <th className="px-4 py-2">Seu lucro</th>
              <th className="px-4 py-2 min-w-[140px]">Retorno</th>
            </tr>
          </thead>
          <tbody>
            {econ.drivers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-5 text-neutral-500">
                  Nenhum motorista ainda.
                </td>
              </tr>
            ) : (
              econ.drivers.map((d) => (
                <tr key={d.id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-white">
                    {d.emoji} {d.name}
                    {d.days_active !== null && (
                      <span className="ml-2 text-[10px] text-neutral-600">
                        {d.days_active}d
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-neutral-300">{money0(d.invested)}</td>
                  <td className="px-4 py-2 text-neutral-300">{d.stock_qty}</td>
                  <td className="px-4 py-2 font-bold text-white">{d.sold}</td>
                  <td className="px-4 py-2 text-neutral-300">{money0(d.revenue)}</td>
                  <td className="px-4 py-2 text-neutral-400">{money0(d.commission)}</td>
                  <td
                    className={`px-4 py-2 font-bold ${
                      d.net_profit > 0 ? "text-move-yellow" : "text-neutral-500"
                    }`}
                  >
                    {money0(d.net_profit)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/50">
                      <div
                        className={`h-full rounded-full ${
                          d.paid_back ? "bg-green-400" : "bg-move-yellow"
                        }`}
                        style={{ width: `${d.payback_pct}%` }}
                      />
                    </div>
                    <span className="mt-1 block text-[10px] text-neutral-500">
                      {d.paid_back
                        ? "✓ investimento pago"
                        : `${d.payback_pct}% do investimento`}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={load}
        className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-neutral-300 hover:border-move-yellow"
      >
        Atualizar
      </button>
    </div>
  );
}

function Line({
  label,
  value,
  strong = false,
  muted = false,
  highlight = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={`text-xs ${muted ? "text-neutral-500" : "text-neutral-300"}`}>
        {label}
      </span>
      <span
        className={`whitespace-nowrap ${
          highlight
            ? "font-display text-lg text-move-yellow"
            : strong
              ? "font-bold text-white"
              : "text-neutral-400"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  hero = false,
}: {
  label: string;
  value: string;
  sub?: string;
  hero?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        hero
          ? "border-move-yellow/50 bg-move-yellow/10"
          : "border-white/10 bg-move-panel"
      }`}
    >
      <p className="font-display text-2xl text-move-yellow">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      {sub && <p className="text-[10px] text-neutral-600">{sub}</p>}
    </div>
  );
}
