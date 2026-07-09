import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Helps catch missing env in dev / build logs
  console.warn("[MOVE+] Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY env vars.");
}

/**
 * Shared Supabase client. Uses the public anon key — safe because every
 * sensitive operation runs through SECURITY DEFINER RPC functions gated by
 * the admin secret. Tables have RLS enabled with no direct-access policies.
 */
export function getSupabase() {
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
