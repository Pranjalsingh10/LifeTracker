"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const periods = ["weekly", "monthly", "yearly"] as const;

export async function createGoal(input: { title: string; details: string; period: string; habitIds: string[] }) {
  const title = input.title.trim();
  const habitIds = [...new Set(input.habitIds)];
  if (!title || title.length > 100 || !periods.includes(input.period as typeof periods[number]) || !habitIds.length || habitIds.some(id => !uuidPattern.test(id))) {
    return { ok: false as const, error: "Add a goal name, choose a time period, and check the selected habits." };
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, error: "Sign in to save a goal." };
  if (habitIds.length) {
    const { data: owned, error } = await supabase.from("habits").select("id").eq("user_id", user.id).in("id", habitIds);
    if (error || owned?.length !== habitIds.length) return { ok: false as const, error: "One or more selected habits could not be found." };
  }
  const { data: goal, error } = await supabase.from("goals").insert({
    user_id: user.id, title, details: input.details.trim() || null, period: input.period,
  }).select("id,title,details,period,created_at").single();
  if (error || !goal) return { ok: false as const, error: error?.message ?? "Could not save this goal." };
  if (habitIds.length) {
    const { error: linkError } = await supabase.from("goal_habits").insert(habitIds.map(habitId => ({ goal_id: goal.id, habit_id: habitId })));
    if (linkError) {
      await supabase.from("goals").delete().eq("id", goal.id).eq("user_id", user.id);
      return { ok: false as const, error: linkError.message };
    }
  }
  return { ok: true as const, goal: { ...goal, habit_ids: habitIds } };
}

export async function deleteGoal(goalId: string) {
  if (!uuidPattern.test(goalId)) return { ok: false as const, error: "Invalid goal." };
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, error: "Sign in to remove a goal." };
  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("user_id", user.id);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
