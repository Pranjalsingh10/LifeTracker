import { HabitDashboard } from "@/features/habits/components/habit-dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dateInKolkata = (date: Date) => new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  const toDateKey = (parts: Record<string, string>) => `${parts.year}-${parts.month}-${parts.day}`;
  const todayKey = toDateKey(dateInKolkata(new Date()));
  const accountCreatedDate = toDateKey(dateInKolkata(new Date(user.created_at)));

  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("id,name,emoji,color,category,target_days,notes,created_at")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (habitsError) {
    if (habitsError.code === "PGRST205" || habitsError.message.includes("public.habits")) {
      return <DatabaseSetupNotice />;
    }
    throw new Error(`Could not load habits: ${habitsError.message}`);
  }

  const habitIds = (habits ?? []).map(h => h.id);
  const completedByHabit = new Map<string, string[]>();
  if (habitIds.length) {
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data: logs, error: logsError } = await supabase
        .from("habit_logs")
        .select("habit_id,logged_on")
        .eq("completed", true)
        .gte("logged_on", accountCreatedDate)
        .lte("logged_on", todayKey)
        .order("logged_on", { ascending: true })
        .order("habit_id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (logsError) {
        if (logsError.code === "PGRST205" || logsError.message.includes("public.habit_logs")) {
          return <DatabaseSetupNotice />;
        }
        throw new Error(`Could not load habit history: ${logsError.message}`);
      }
      for (const log of logs ?? []) {
        const dates = completedByHabit.get(log.habit_id) ?? [];
        dates.push(log.logged_on);
        completedByHabit.set(log.habit_id, dates);
      }
      if (!logs || logs.length < pageSize) break;
    }
  }

  const initialHabits = (habits ?? []).map(h => ({
    ...h,
    created_at: toDateKey(dateInKolkata(new Date(h.created_at))),
    completed_dates: completedByHabit.get(h.id) ?? [],
  }));
  const displayName = String(user.user_metadata?.display_name || user.email?.split("@")[0] || "Friend");
  return <HabitDashboard initialHabits={initialHabits} todayKey={todayKey} accountCreatedDate={accountCreatedDate} displayName={displayName} />;
}

function DatabaseSetupNotice() {
  return <main className="grid min-h-screen place-items-center bg-[#17191c] px-5 text-[#ecebe7]">
    <section className="max-w-lg rounded-2xl border border-white/10 bg-[#202326] p-7">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#f4a16d]">One-time database setup</p>
      <h1 className="mt-2 text-2xl font-semibold">Create your habit tables</h1>
      <p className="mt-3 text-sm leading-6 text-[#a5a69f]">Your email confirmation succeeded, but Supabase does not have the app’s habit tables yet. Open SQL Editor, run the project’s <code className="text-[#d5f795]">supabase/schema.sql</code>, then come back here.</p>
      <a href="https://supabase.com/dashboard/project/qsxyotxppoywoyjwfujd/sql" target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-[#f28b55] px-4 py-2.5 text-sm font-semibold text-[#211915] hover:bg-[#ffa36d]">Open Supabase SQL Editor</a>
      <p className="mt-4 text-xs text-[#898c84]">In the SQL Editor, choose a new query, paste the contents of <code>supabase/schema.sql</code>, and click Run.</p>
      <a href="/" className="mt-5 inline-block text-xs text-[#c8ff78] underline underline-offset-4">Refresh after setup</a>
    </section>
  </main>;
}
