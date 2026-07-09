import { createClient } from "@supabase/supabase-js";

// Public project values (anon key is safe to ship — every write goes through
// SECURITY DEFINER functions gated by the admin secret, and tables have RLS on).
// Env vars override these when present.
const DEFAULT_URL = "https://rqeoqxffypvspqnqcefo.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxZW9xeGZmeXB2c3BxbnFjZWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNzA2OTUsImV4cCI6MjA5ODk0NjY5NX0.BcE50wz1ExW-eSKveY5MR2Q9AK_OT8csZazoJurwAm0";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

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
