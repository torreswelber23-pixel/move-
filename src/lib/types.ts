export type ExperienceType =
  | "reward"
  | "challenge"
  | "content"
  | "discount"
  | "community";

export type Rarity = "comum" | "raro" | "epico" | "lendario";

export interface Experience {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  type: ExperienceType;
  reward_label: string | null;
  reward_code: string | null;
  content_url: string | null;
  rarity: Rarity;
  weight: number;
  emoji: string | null;
  active: boolean;
  created_at?: string;
}

export interface ScanResult {
  ok: boolean;
  error?: "not_found" | "disabled";
  is_first?: boolean;
  scan_count?: number;
  code?: string;
  experience?: {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    type: ExperienceType;
    reward_label: string | null;
    reward_code: string | null;
    content_url: string | null;
    rarity: Rarity;
    emoji: string | null;
  } | null;
}

export interface CheckResult {
  ok: boolean;
  error?: "not_found" | "disabled";
  code?: string;
  prize_label?: string;
  whatsapp_group_link?: string;
  raffle_open?: boolean;
  already_registered?: boolean;
  entry_name?: string | null;
}

export interface RegisterResult {
  ok: boolean;
  error?: "closed" | "invalid_name" | "invalid_phone" | "not_found" | "disabled";
  already?: boolean;
  name?: string;
  whatsapp_group_link?: string;
}

export const RARITY_META: Record<
  Rarity,
  { label: string; color: string; glow: string }
> = {
  comum: { label: "Comum", color: "#d4d4d4", glow: "rgba(212,212,212,0.35)" },
  raro: { label: "Raro", color: "#4aa3ff", glow: "rgba(74,163,255,0.45)" },
  epico: { label: "Épico", color: "#b06bff", glow: "rgba(176,107,255,0.5)" },
  lendario: { label: "Lendário", color: "#f5d30a", glow: "rgba(245,211,10,0.6)" },
};

export const TYPE_META: Record<ExperienceType, { label: string }> = {
  reward: { label: "Recompensa" },
  challenge: { label: "Desafio" },
  content: { label: "Conteúdo" },
  discount: { label: "Cupom" },
  community: { label: "Comunidade" },
};
