"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HabitInput } from "@/features/habits/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function saveHabitLogs(changes: Array<{ habitId: string; date: string; completed: boolean }>) {
  if (changes.length === 0) return { ok: true };
  if (changes.length > 500) return { ok: false, error: "Batch is too large." };
  if (changes.some(c => !uuidPattern.test(c.habitId) || !datePattern.test(c.date) || typeof c.completed !== "boolean")) {
    return { ok: false, error: "Invalid habit update." };
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: "Sign in to save changes." };

  // Upsert both checked and unchecked states in one call. RLS validates the owner.
  const rows = changes.map(c => ({ habit_id: c.habitId, logged_on: c.date, completed: c.completed }));
  const { error } = await supabase.from("habit_logs").upsert(rows, { onConflict: "habit_id,logged_on" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createHabit(input: HabitInput) {
  const name = input.name.trim();
  if (!name || name.length > 80 || input.targetDays < 1 || input.targetDays > 7 || !Number.isInteger(input.targetDays)) {
    return { ok: false as const, error: "Please enter a habit name and choose 1–7 days." };
  }
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) return { ok: false as const, error: "Choose a valid habit color." };
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, error: "Sign in to create habits." };
  const { data, error } = await supabase.from("habits").insert({
    user_id: user.id, name, emoji: input.emoji, color: input.color,
    category: input.category, target_days: input.targetDays, notes: input.notes || null,
  }).select("id,name,emoji,color,category,target_days,notes,created_at").single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, habit: data };
}

export async function updateHabit(habitId: string, input: HabitInput) {
  const name = input.name.trim();
  if (!uuidPattern.test(habitId) || !name || name.length > 80 || input.targetDays < 1 || input.targetDays > 7 || !Number.isInteger(input.targetDays)) {
    return { ok: false as const, error: "Please enter a habit name and choose 1–7 days." };
  }
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) return { ok: false as const, error: "Choose a valid habit color." };
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, error: "Sign in to edit habits." };
  const { data, error } = await supabase.from("habits").update({
    name, emoji: input.emoji, color: input.color, category: input.category,
    target_days: input.targetDays, notes: input.notes || null, updated_at: new Date().toISOString(),
  }).eq("id", habitId).eq("user_id", user.id)
    .select("id,name,emoji,color,category,target_days,notes").single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, habit: data };
}

export async function archiveHabit(habitId: string) {
  if (!uuidPattern.test(habitId)) return { ok: false as const, error: "Invalid habit." };
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, error: "Sign in to archive habits." };
  const { error } = await supabase.from("habits").update({ archived_at: new Date().toISOString() })
    .eq("id", habitId).eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
