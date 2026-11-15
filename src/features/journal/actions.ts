"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function saveJournalEntry(input: { date: string; title: string; body: string; mood: string }) {
  const date = input.date;
  const title = input.title.trim();
  const body = input.body.trim();
  if (!datePattern.test(date) || (!title && !body) || title.length > 120 || body.length > 20000) {
    return { ok: false as const, error: "Add a title or a note. Keep the title under 120 characters." };
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, error: "Sign in to save your journal." };
  const { data, error } = await supabase.from("diary_entries").upsert({
    user_id: user.id,
    entry_date: date,
    title: title || null,
    body,
    mood: input.mood || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,entry_date" }).select("id,entry_date,title,body,mood,updated_at").single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, entry: data };
}
