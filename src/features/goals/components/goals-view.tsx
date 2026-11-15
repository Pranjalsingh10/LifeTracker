"use client";

import { useMemo, useState } from "react";
import { Activity, Plus, Target, Trash2, X } from "lucide-react";
import { createGoal, deleteGoal } from "@/features/goals/actions";

export type GoalRecord = { id: string; title: string; details: string | null; period: "weekly" | "monthly" | "yearly"; created_at: string; habit_ids: string[] };
export type GoalHabit = { id: string; name: string; emoji: string; target: number; done: string[] };
type Period = GoalRecord["period"];
const periodLabel: Record<Period, string> = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function currentRange(period: Period, todayKey: string) {
  const today = new Date(`${todayKey}T12:00:00`);
  const start = new Date(today);
  if (period === "weekly") start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  if (period === "monthly") start.setDate(1);
  if (period === "yearly") { start.setMonth(0, 1); }
  const elapsed = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
  return { start, elapsed };
}

function chartBuckets(period: Period, todayKey: string, linked: GoalHabit[]) {
  const { start, elapsed } = currentRange(period, todayKey);
  const count = period === "weekly" ? 7 : period === "monthly" ? 5 : 12;
  const labels = period === "weekly" ? ["M", "T", "W", "T", "F", "S", "S"] : period === "monthly" ? ["1–7", "8–14", "15–21", "22–28", "29+"] : ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const buckets = Array.from({ length: count }, (_, index) => ({ label: labels[index], value: 0 }));
  let total = 0;
  for (const habit of linked) for (const key of habit.done) {
    if (key < dayKey(start) || key > todayKey) continue;
    const date = new Date(`${key}T12:00:00`);
    const index = period === "weekly" ? Math.floor((date.getTime() - start.getTime()) / 86400000) : period === "monthly" ? Math.min(4, Math.floor((date.getDate() - 1) / 7)) : date.getMonth();
    if (buckets[index]) { buckets[index].value++; total++; }
  }
  const expected = linked.reduce((sum, habit) => sum + habit.target * elapsed / 7, 0);
  const percent = expected ? Math.round(total / expected * 100) : 0;
  return { buckets, total, expected: Math.ceil(expected), percent, elapsed };
}

export function GoalsView({ initialGoals, habits, todayKey }: { initialGoals: GoalRecord[]; habits: GoalHabit[]; todayKey: string }) {
  const [goals, setGoals] = useState(initialGoals);
  const [filter, setFilter] = useState<Period>("weekly");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [period, setPeriod] = useState<Period>("weekly");
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const summaries = useMemo(() => goals.map(goal => {
    const linked = habits.filter(habit => goal.habit_ids.includes(habit.id));
    return { goal, linked, report: chartBuckets(goal.period, todayKey, linked) };
  }), [goals, habits, todayKey]);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedHabits.length) { setMessage("Choose at least one habit for the progress report."); return; }
    setBusy(true); setMessage("");
    const result = await createGoal({ title, details, period, habitIds: selectedHabits });
    setBusy(false);
    if (!result.ok) { setMessage(result.error); return; }
    setGoals(list => [result.goal as GoalRecord, ...list]); setTitle(""); setDetails(""); setSelectedHabits([]); setShowForm(false);
  };
  const remove = async (goal: GoalRecord) => {
    const result = await deleteGoal(goal.id);
    if (!result.ok) { setMessage(result.error); return; }
    setGoals(list => list.filter(item => item.id !== goal.id));
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[.14em] text-[#f4a16d]">Make progress visible</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Goals</h2><p className="mt-2 text-sm text-[#999c95]">Connect goals to habits. Your report updates when you check off a habit.</p></div><button onClick={() => { setShowForm(value => !value); setMessage(""); }} className="inline-flex items-center gap-2 rounded-xl bg-[#c4f67a] px-4 py-2.5 text-xs font-semibold text-[#20231a] hover:bg-[#d4ff8a]">{showForm ? <X size={15}/> : <Plus size={15}/>} {showForm ? "Close" : "Add goal"}</button></div>
    {showForm && <form onSubmit={save} className="rounded-2xl border border-white/[.08] bg-[#202326] p-5 sm:p-6"><div className="grid gap-4 md:grid-cols-2"><label className="text-xs text-[#aeb0a8]">Goal name<input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g., Build a calm morning routine" className="mt-2 h-10 w-full rounded-xl border border-white/[.09] bg-[#191b1e] px-3 text-sm text-white outline-none focus:border-[#c4f67a]"/></label><label className="text-xs text-[#aeb0a8]">Time period<select value={period} onChange={event => setPeriod(event.target.value as Period)} className="mt-2 h-10 w-full rounded-xl border border-white/[.09] bg-[#191b1e] px-3 text-sm text-white outline-none focus:border-[#c4f67a]"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label><label className="text-xs text-[#aeb0a8] md:col-span-2">Why is this goal important?<textarea rows={2} value={details} onChange={event => setDetails(event.target.value)} placeholder="Add a note to remind yourself..." className="mt-2 w-full rounded-xl border border-white/[.09] bg-[#191b1e] p-3 text-sm text-white outline-none focus:border-[#c4f67a]"/></label></div><div className="mt-4"><p className="text-xs font-medium text-[#d9dbd3]">Habits that help with this goal</p>{habits.length ? <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{habits.map(habit => <label key={habit.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/[.07] bg-[#191b1e] p-3 text-xs text-[#d6d8d0]"><input type="checkbox" checked={selectedHabits.includes(habit.id)} onChange={event => setSelectedHabits(list => event.target.checked ? [...list, habit.id] : list.filter(id => id !== habit.id))} className="accent-lime-300"/><span>{habit.emoji} {habit.name}</span><span className="ml-auto text-[10px] text-[#858981]">{habit.target}× / week</span></label>)}</div> : <p className="mt-2 text-xs text-[#92958d]">Add a habit first. A goal needs at least one habit to make a report.</p>}</div><div className="mt-4 flex items-center justify-between gap-3"><p role="status" className="text-xs text-[#ff9b9b]">{message}</p><button disabled={busy || !habits.length} className="rounded-xl bg-[#c4f67a] px-4 py-2 text-xs font-semibold text-[#20231a] disabled:opacity-50">{busy ? "Saving..." : "Save goal"}</button></div></form>}
    <div className="flex flex-wrap gap-2">{(["weekly", "monthly", "yearly"] as Period[]).map(item => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-xs font-medium ${filter === item ? "bg-[#c4f67a] text-[#20231a]" : "border border-white/[.09] bg-[#202326] text-[#aeb0a8] hover:bg-white/[.05]"}`}>{periodLabel[item]}</button>)}</div>
    {message && !showForm && <p role="status" className="text-xs text-[#ff9b9b]">{message}</p>}
    {summaries.filter(item => item.goal.period === filter).length ? <div className="grid gap-4 lg:grid-cols-2">{summaries.filter(item => item.goal.period === filter).map(({ goal, linked, report }) => <article key={goal.id} className="rounded-2xl border border-white/[.08] bg-[#202326] p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#30352c] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#c4f67a]"><Target size={12}/>{periodLabel[goal.period]} goal</span><h3 className="mt-3 text-lg font-semibold">{goal.title}</h3>{goal.details && <p className="mt-1 text-xs leading-5 text-[#999c95]">{goal.details}</p>}</div><button onClick={() => void remove(goal)} aria-label={`Delete ${goal.title}`} className="rounded-lg p-2 text-[#888c84] hover:bg-red-400/10 hover:text-red-300"><Trash2 size={15}/></button></div><div className="mt-5 flex items-end justify-between"><div><p className="text-3xl font-bold tracking-tight text-[#c4f67a]">{report.percent}%</p><p className="mt-1 text-[10px] text-[#969990]">of expected pace so far</p></div><p className="text-right text-xs text-[#d0d2ca]">{report.total} <span className="text-[#858981]">done</span><br/>{report.expected} <span className="text-[#858981]">expected by today</span></p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#373b3d]"><div className="h-full rounded-full bg-gradient-to-r from-[#34d399] via-[#c4f67a] to-[#ffd166] shadow-[0_0_12px_#c4f67a77] transition-all" style={{ width: `${Math.min(100, report.percent)}%` }}/></div><div className="mt-5 flex h-28 items-end gap-2">{report.buckets.map((bucket, index) => { const max = Math.max(1, ...report.buckets.map(item => item.value)); return <div key={`${bucket.label}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-[84px] w-full items-end rounded-t-md bg-[#191b1e]"><div title={`${bucket.value} completions`} className="w-full rounded-t-md bg-gradient-to-t from-[#38856e] to-[#c4f67a] shadow-[0_0_10px_#a5e36e33] transition-all" style={{ height: `${bucket.value ? Math.max(8, bucket.value / max * 84) : 3}px` }}/></div><span className="text-[9px] text-[#8f938b]">{bucket.label}</span></div>; })}</div><div className="mt-4 border-t border-white/[.07] pt-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-[#878b83]">Habits linked to this goal</p><div className="mt-2 flex flex-wrap gap-1.5">{linked.map(habit => <span key={habit.id} className="rounded-full bg-[#191b1e] px-2.5 py-1 text-[10px] text-[#c5c8bf]">{habit.emoji} {habit.name}</span>)}</div>{!linked.length && <p className="mt-1 text-[10px] text-[#ffb28a]">Edit this goal to connect habits and see its report.</p>}</div></article>)}</div> : <div className="rounded-2xl border border-dashed border-white/[.13] bg-[#202326] px-6 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#30352c] text-[#c4f67a]"><Activity size={22}/></div><h3 className="mt-4 text-sm font-semibold">No {filter} goals yet</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#92958d]">Add a goal, link it to the habits that support it, and watch your progress report grow.</p><button onClick={() => setShowForm(true)} className="mt-4 rounded-xl bg-[#c4f67a] px-4 py-2 text-xs font-semibold text-[#20231a]">Create a {filter} goal</button></div>}
  </div>;
}
