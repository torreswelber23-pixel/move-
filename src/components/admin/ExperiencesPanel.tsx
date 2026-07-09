"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Experience, ExperienceType, Rarity } from "@/lib/types";
import { RARITY_META, TYPE_META } from "@/lib/types";

const EMPTY: Partial<Experience> = {
  title: "",
  subtitle: "",
  description: "",
  type: "reward",
  reward_label: "",
  reward_code: "",
  content_url: "",
  rarity: "comum",
  weight: 100,
  emoji: "🎁",
  active: true,
};

export function ExperiencesPanel({ secret }: { secret: string }) {
  const [list, setList] = useState<Experience[]>([]);
  const [editing, setEditing] = useState<Partial<Experience> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.rpc("move_admin_list_experiences", {
      p_secret: secret,
    });
    setList((data as Experience[]) ?? []);
  }, [secret]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const supabase = getSupabase();
    await supabase.rpc("move_admin_save_experience", {
      p_secret: secret,
      p_payload: editing,
    });
    setSaving(false);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta experiência?")) return;
    const supabase = getSupabase();
    await supabase.rpc("move_admin_delete_experience", {
      p_secret: secret,
      p_id: id,
    });
    load();
  }

  async function toggleActive(exp: Experience) {
    const supabase = getSupabase();
    await supabase.rpc("move_admin_save_experience", {
      p_secret: secret,
      p_payload: { ...exp, active: !exp.active },
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl uppercase text-white">Experiências</h2>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="rounded-lg bg-move-yellow px-4 py-2 text-sm font-black uppercase tracking-wider text-black"
        >
          + Nova
        </button>
      </div>

      <p className="mt-2 text-sm text-neutral-500">
        O peso define a chance de sorteio (maior = mais comum). Uma experiência é
        atribuída à garrafa no primeiro scan.
      </p>

      {/* list */}
      <div className="mt-6 grid gap-3">
        {list.map((exp) => {
          const rarity = RARITY_META[exp.rarity as Rarity];
          return (
            <div
              key={exp.id}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-move-panel p-4"
            >
              <div className="text-3xl">{exp.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-white">{exp.title}</p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{ color: rarity.color, border: `1px solid ${rarity.color}` }}
                  >
                    {rarity.label}
                  </span>
                  <span className="text-[10px] uppercase text-neutral-500">
                    {TYPE_META[exp.type as ExperienceType].label} · peso {exp.weight}
                  </span>
                </div>
                {exp.subtitle && (
                  <p className="truncate text-sm text-neutral-400">{exp.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => toggleActive(exp)}
                className={`rounded-lg px-3 py-1 text-xs font-bold ${
                  exp.active
                    ? "bg-move-yellow/20 text-move-yellow"
                    : "bg-neutral-800 text-neutral-500"
                }`}
              >
                {exp.active ? "Ativa" : "Inativa"}
              </button>
              <button
                onClick={() => setEditing(exp)}
                className="text-xs font-semibold text-neutral-400 hover:text-white"
              >
                Editar
              </button>
              <button
                onClick={() => remove(exp.id)}
                className="text-xs font-semibold text-red-400/70 hover:text-red-400"
              >
                Excluir
              </button>
            </div>
          );
        })}
      </div>

      {/* editor modal */}
      {editing && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-move-panel p-6"
          >
            <h3 className="font-display text-xl uppercase text-white">
              {editing.id ? "Editar experiência" : "Nova experiência"}
            </h3>

            <div className="mt-4 grid gap-3">
              <Field label="Título">
                <input
                  required
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Emoji">
                  <input
                    value={editing.emoji ?? ""}
                    onChange={(e) => setEditing({ ...editing, emoji: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Subtítulo">
                  <input
                    value={editing.subtitle ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, subtitle: e.target.value })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Descrição">
                <textarea
                  rows={2}
                  value={editing.description ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <select
                    value={editing.type}
                    onChange={(e) =>
                      setEditing({ ...editing, type: e.target.value as ExperienceType })
                    }
                    className={inputCls}
                  >
                    {Object.entries(TYPE_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Raridade">
                  <select
                    value={editing.rarity}
                    onChange={(e) =>
                      setEditing({ ...editing, rarity: e.target.value as Rarity })
                    }
                    className={inputCls}
                  >
                    {Object.entries(RARITY_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rótulo da recompensa">
                  <input
                    value={editing.reward_label ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, reward_label: e.target.value })
                    }
                    placeholder="ex: 10% OFF"
                    className={inputCls}
                  />
                </Field>
                <Field label="Código do cupom">
                  <input
                    value={editing.reward_code ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, reward_code: e.target.value })
                    }
                    placeholder="ex: MOVE10"
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Link (conteúdo/comunidade)">
                <input
                  value={editing.content_url ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, content_url: e.target.value })
                  }
                  placeholder="https://…"
                  className={inputCls}
                />
              </Field>
              <Field label={`Peso (chance de sorteio): ${editing.weight}`}>
                <input
                  type="range"
                  min={1}
                  max={300}
                  value={editing.weight ?? 100}
                  onChange={(e) =>
                    setEditing({ ...editing, weight: Number(e.target.value) })
                  }
                  className="w-full accent-move-yellow"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={editing.active ?? true}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                  className="accent-move-yellow"
                />
                Ativa (entra no sorteio)
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-neutral-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-move-yellow px-4 py-2.5 text-sm font-black uppercase tracking-wider text-black disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white focus:border-move-yellow focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}
