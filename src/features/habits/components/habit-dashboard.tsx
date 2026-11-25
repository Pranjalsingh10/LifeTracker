 "use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownToLine, BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Flame, Flower2, LayoutGrid, ListChecks, LogOut, Menu, Moon, Plus, Search, Sparkles, Sun, Target, WalletCards, X } from "lucide-react";
import { archiveHabit, createHabit, saveHabitLogs, updateHabit } from "@/features/habits/actions";
import type { HabitInput, HabitView } from "@/features/habits/types";
import { signOut } from "@/features/auth/actions";
import { HabitActionMenu, HabitCalendar, HabitInsights, HabitsTable } from "@/features/habits/components/habit-views";
import { JournalView, type JournalRecord } from "@/features/journal/components/journal-view";
import { GoalsView, type GoalRecord } from "@/features/goals/components/goals-view";
import { ExpensesView, type ExpenseRecord, type ExpenseTypeRecord } from "@/features/finance/components/expenses-view";
import { BrandMark } from "@/components/brand-mark";

type Habit = HabitView;
type HabitRecord = { id: string; name: string; emoji: string; color: string; category: string; target_days: number; notes: string | null; created_at: string; completed_dates: string[] };
type Change = { habitId: string; date: string; completed: boolean };
const colors = ["#378de5", "#16bc9a", "#28a76d", "#88be32", "#fed332", "#fc982e", "#fd5656", "#ec3f8a", "#8f57eb", "#4b68eb", "#13a986", "#00a884", "#599d26", "#eba912", "#fd8b1e", "#f04e4e", "#d52a83", "#7d48da", "#3a55dc", "#318847"];
const emojis = ["ðŸ’ª", "ðŸƒ", "ðŸ“š", "ðŸ’§", "ðŸ§˜", "ðŸŽ", "ðŸ§¹", "ðŸŽ¯", "ðŸ“–", "ðŸŽ¨", "ðŸŽµ", "ðŸ‹ï¸", "ðŸ§ ", "ðŸ˜´", "ðŸŒž", "ðŸŒ±", "ðŸ“", "â›º", "ðŸš€", "â­", "ðŸ”¥", "ðŸ’¡", "ðŸŒˆ", "ðŸŽ", "ðŸ†", "ðŸ’Ž", "ðŸŒ™", "â˜•", "ðŸƒ", "ðŸŽ¬"];
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const weekFor = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - 6);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(date); day.setDate(date.getDate() + i);
    return { day: day.toLocaleDateString("en", { weekday: "short" }), date: day.getDate(), key: dayKey(day) };
  });
};

export function HabitDashboard({ initialHabits, todayKey, accountCreatedDate, displayName, initialEntries, initialGoals, initialExpenses, initialExpenseTypes, initialBudgetMinor, monthStart, journalGoalsReady, financeTablesReady }: { initialHabits: HabitRecord[]; todayKey: string; accountCreatedDate: string; displayName: string; initialEntries: JournalRecord[]; initialGoals: GoalRecord[]; initialExpenses: ExpenseRecord[]; initialExpenseTypes: ExpenseTypeRecord[]; initialBudgetMinor: number; monthStart: string; journalGoalsReady: boolean; financeTablesReady: boolean }) {
  const [habits, setHabits] = useState<Habit[]>(() => initialHabits.map(h => ({ id: h.id, name: h.name, emoji: h.emoji, color: h.color, category: h.category, target: h.target_days, notes: h.notes ?? "", createdAt: h.created_at, done: new Set(h.completed_dates) })));
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [activeTab, setActiveTab] = useState("Today");
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [themeReady, setThemeReady] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("life-tracker-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    setThemeReady(true);
  }, []);
  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("life-tracker-theme", theme);
  }, [theme, themeReady]);
  const pending = useRef(new Map<string, Change>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = habits.filter(h => h.done.has(selectedDate)).length;
  const percent = habits.length ? Math.round((completed / habits.length) * 100) : 0;
  const week = useMemo(() => weekFor(selectedDate), [selectedDate]);
  const groups = useMemo(() => ["Movement", "Mindfulness", "Wellbeing", "Reflection", "Health", "Work", "Personal", "Learning", "Other"].map(name => ({ name, habits: habits.filter(h => h.category === name) })).filter(group => group.habits.length), [habits]);

  const flushPending = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const batch = Array.from(pending.current.values());
    if (!batch.length) return;
    pending.current.clear();
    setSaveState("saving");
    const result = await saveHabitLogs(batch);
    if (!result.ok) {
      for (const change of batch) {
        const key = `${change.habitId}|${change.date}`;
        if (!pending.current.has(key)) pending.current.set(key, change);
      }
      setSaveState("error");
      setFeedback(result.error ?? "Could not save changes. Try again.");
      return;
    }
    setSaveState("saved");
    setFeedback("");
    if (pending.current.size) timer.current = setTimeout(() => void flushPending(), 650);
  }, []);

  const toggle = (habitId: string, key = selectedDate) => {
    const completed = !habits.find(h => h.id === habitId)?.done.has(key);
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const done = new Set(h.done);
      if (done.has(key)) done.delete(key); else done.add(key);
      return { ...h, done };
    }));
    pending.current.set(`${habitId}|${key}`, { habitId, date: key, completed });
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushPending(), 700);
  };

  const openAdd = () => { setEditingHabit(null); setFeedback(""); setShowForm(true); };
  const saveHabit = async (input: HabitInput) => {
    if (editingHabit) {
      const result = await updateHabit(editingHabit.id, input);
      if (!result.ok) { setFeedback(result.error); return false; }
      setHabits(list => list.map(h => h.id === editingHabit.id ? { ...h, name: input.name, emoji: input.emoji, color: input.color, category: input.category, target: input.targetDays, notes: input.notes } : h));
    } else {
      const result = await createHabit(input);
      if (!result.ok) { setFeedback(result.error); return false; }
      const h = result.habit;
      setHabits(list => [...list, { id: h.id, name: h.name, emoji: h.emoji, color: h.color, category: h.category, target: h.target_days, notes: h.notes ?? "", createdAt: dayKey(new Date()), done: new Set() }]);
    }
    setFeedback(""); setEditingHabit(null); setShowForm(false); return true;
  };
  const editHabit = (habit: Habit) => { setEditingHabit(habit); setFeedback(""); setShowForm(true); };
  const handleArchive = async (habit: Habit) => {
    if (!window.confirm(`Archive â€œ${habit.name}â€? Its completion history will be kept.`)) return;
    const result = await archiveHabit(habit.id);
    if (!result.ok) { window.alert(result.error); return; }
    setHabits(list => list.filter(h => h.id !== habit.id));
  };

  const weekTotal = habits.reduce((sum, h) => sum + week.filter(d => h.done.has(d.key)).length, 0);
  const weekPercent = habits.length ? Math.round(weekTotal / (habits.length * 7) * 100) : 0;
  const weekLabel = week.length ? `${new Date(`${week[0].key}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })} â€“ ${new Date(`${week[6].key}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })}` : "";

  return <main className="min-h-screen bg-[#17191c] text-[#ecebe7]">
    <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col border-r border-white/[.07] bg-[#1d2023] px-5 py-5 transition-transform md:translate-x-0`}>
      <div className="flex items-center gap-3 px-2"><div className="grid h-10 w-10 place-items-center rounded-[15px] bg-[#342d28] text-[#c4f67a]"><BrandMark className="h-7 w-7"/></div><span className="text-[21px] font-semibold tracking-[-.04em]">Life Tracker</span><button aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="ml-auto text-[#9a9a91] md:hidden"><X size={18}/></button></div>
      <p className="mb-2 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#777a76]">Workspace</p>
      <nav className="space-y-1">{[["Today", ListChecks], ["Habits", Flower2], ["Calendar", CalendarDays], ["Insights", Activity]].map(([name, Icon]: any) => <button key={name} onClick={() => { setActiveTab(name); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${activeTab === name ? "bg-[#342d28] font-medium text-[#f4ad7a]" : "text-[#a4a59e] hover:bg-white/[.04] hover:text-[#e4e2dc]"}`}><Icon size={17} strokeWidth={1.8}/>{name}{name === "Today" && <span className="ml-auto rounded-full bg-white/[.08] px-2 py-0.5 text-[10px] text-[#c4c4bd]">{habits.length}</span>}</button>)}</nav>
      <p className="mb-2 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#777a76]">Your space</p>
      <nav className="space-y-1">{[["Journal", BookOpen], ["Goals", Target], ["Expense calculator", WalletCards]].map(([name, Icon]: any) => <button key={name} onClick={() => { setActiveTab(name); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${activeTab === name ? "bg-[#342d28] font-medium text-[#f4ad7a]" : "text-[#a4a59e] hover:bg-white/[.04]"}`}><Icon size={17} strokeWidth={1.8}/>{name}</button>)}</nav>
      <div className="mt-auto rounded-2xl border border-[#394033] bg-[#252b25] p-4"><div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-[#303a30] text-[#bcf36b]"><Sparkles size={17}/></div><p className="text-[13px] font-medium">A little at a time</p><p className="mt-1 text-[11px] leading-relaxed text-[#9da395]">Small steps become lovely routines.</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/25"><div className="h-full w-2/3 rounded-full bg-[#b5f45f]"/></div></div>
      <div className="mt-5 flex items-center gap-3 rounded-xl px-2 py-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#39312d] text-xs font-semibold text-[#f4b384]">{displayName.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{displayName}</span><span className="mt-0.5 block text-[10px] text-[#858781]">Personal account</span></span><form action={signOut}><button type="submit" aria-label="Sign out" title="Sign out" className="grid h-8 w-8 place-items-center rounded-lg text-[#92948d] hover:bg-white/[.07] hover:text-white"><LogOut size={15}/></button></form></div>
    </aside>
    {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 bg-black/55 md:hidden"/>}
    <div className="min-h-screen md:pl-[248px]">
      <header className="sticky top-0 z-10 border-b border-white/[.07] bg-[#17191c]/95 backdrop-blur"><div className="mx-auto flex h-[66px] max-w-[1420px] items-center justify-between gap-4 px-5 md:px-9"><div className="flex items-center gap-3"><button aria-label="Open menu" onClick={() => setSidebarOpen(true)} className="text-[#a5a69f] md:hidden"><Menu size={20}/></button><div className="hidden items-center gap-2 text-xs text-[#777a76] sm:flex">My space <ChevronRight size={13}/> <span className="text-[#d4d2cc]">{activeTab}</span></div><h1 className="text-[15px] font-semibold sm:hidden">{activeTab}</h1></div><div className="flex items-center gap-2"><button aria-label="Search" className="grid h-9 w-9 place-items-center rounded-xl text-[#9d9f98] hover:bg-white/[.06]"><Search size={17}/></button><span className={`hidden items-center gap-1.5 px-2 text-[10px] sm:flex ${saveState === "error" ? "text-[#fb7185]" : "text-[#8f938b]"}`}><span className={`h-1.5 w-1.5 rounded-full ${saveState === "saved" ? "bg-[#a3e635]" : saveState === "saving" ? "animate-pulse bg-[#fbbf24]" : "bg-[#fb7185]"}`}/>{saveState === "saved" ? "All changes saved" : saveState === "saving" ? "Savingâ€¦" : "Save failed"}</span><button onClick={() => window.print()} title="Export" className="hidden h-9 items-center gap-2 rounded-xl px-3 text-xs text-[#a5a69f] hover:bg-white/[.06] sm:flex"><ArrowDownToLine size={15}/> Export</button><button onClick={openAdd} className="flex h-9 items-center gap-1.5 rounded-xl bg-[#f28b55] px-3.5 text-xs font-semibold text-[#211915] shadow-lg shadow-[#f28b55]/10 transition hover:bg-[#ffa36d]"><Plus size={15}/> Add habit</button><button type="button" role="switch" aria-checked={theme === "light"} onClick={() => setTheme(current => current === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Turn light mode on" : "Turn dark mode on"} title={theme === "dark" ? "Light mode" : "Dark mode"} className="ml-1 flex h-8 w-[54px] items-center rounded-full border border-white/[.1] bg-[#282a2d] p-1 transition-colors hover:bg-[#34383d]"><span className={`grid h-6 w-6 place-items-center rounded-full bg-[#c4f67a] text-[#20231a] shadow transition-transform ${theme === "light" ? "translate-x-6" : "translate-x-0"}`}>{theme === "dark" ? <Moon size={13}/> : <Sun size={13}/>}</span></button></div></div></header>
      <div className="mx-auto grid max-w-[1420px] grid-cols-1 gap-7 px-5 py-7 md:px-9 xl:grid-cols-[minmax(0,1fr)_294px] xl:gap-9 xl:py-9">
        <section className={activeTab === "Today" ? "min-w-0" : "min-w-0 xl:col-span-2"}>
          {activeTab === "Journal" ? journalGoalsReady ? <JournalView initialEntries={initialEntries} todayKey={todayKey}/> : <FeatureDatabaseNotice/> : activeTab === "Goals" ? journalGoalsReady ? <GoalsView initialGoals={initialGoals} todayKey={todayKey} habits={habits.map(h => ({ id: h.id, name: h.name, emoji: h.emoji, target: h.target, done: [...h.done] }))}/> : <FeatureDatabaseNotice/> : activeTab === "Expense calculator" ? financeTablesReady ? <ExpensesView todayKey={todayKey} monthStart={monthStart} initialExpenses={initialExpenses} initialExpenseTypes={initialExpenseTypes} initialBudgetMinor={initialBudgetMinor}/> : <FeatureDatabaseNotice/> : activeTab === "Habits" ? <HabitsTable habits={habits} todayKey={todayKey} accountCreatedDate={accountCreatedDate} onAdd={openAdd} onEdit={editHabit} onArchive={handleArchive} onToggle={toggle}/> : activeTab === "Calendar" ? <HabitCalendar habits={habits} todayKey={todayKey} accountCreatedDate={accountCreatedDate} onEdit={editHabit} onArchive={handleArchive} onToggle={toggle}/> : activeTab === "Insights" ? <HabitInsights habits={habits} todayKey={todayKey}/> : <>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[12px] font-medium tracking-wide text-[#f4a16d]">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><h2 className="text-[28px] font-semibold tracking-[-.045em] text-[#f1f0eb] sm:text-[34px]">A gentle day, {displayName.split(" ")[0]} <span className="ml-1 text-[27px]">â˜€ï¸</span></h2><p className="mt-2 text-[13px] text-[#999c95]">One small promise at a time. Youâ€™ve got this.</p></div><button className="flex items-center gap-2 rounded-xl border border-white/[.09] bg-[#222528] px-3 py-2 text-xs text-[#c4c4bd] hover:bg-[#292c30]"><CalendarDays size={15}/>{selectedDate === todayKey ? "Today" : new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })}<ChevronDown size={14}/></button></div>
          <div className="mb-7 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-4 rounded-2xl border border-white/[.07] bg-[#202326] px-5 py-4 shadow-[0_12px_40px_-28px_rgba(0,0,0,.9)]"><div className="relative grid h-[58px] w-[58px] shrink-0 place-items-center"><svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full -rotate-90"><circle cx="28" cy="28" r="23" fill="none" stroke="#353940" strokeWidth="5"/><circle cx="28" cy="28" r="23" fill="none" stroke="#b5f45f" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${percent * 1.445} 145`} style={{ filter: "drop-shadow(0 0 5px #a3e63588)" }}/></svg><span className="text-[13px] font-bold text-[#c9ff79]">{percent}%</span></div><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#ebeae4]">Youâ€™re finding your rhythm</p><p className="mt-1 text-[11px] text-[#92958d]">{completed} of {habits.length} habits complete today</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#34373b]"><div className="h-full rounded-full bg-gradient-to-r from-[#69d69b] to-[#c8ff61] shadow-[0_0_12px_#9fe95c66] transition-all" style={{ width: `${percent}%` }}/></div></div><Sparkles size={18} className="hidden text-[#ffae63] sm:block"/></div>
            <div className="flex min-w-[170px] items-center gap-3 rounded-2xl border border-[#594033] bg-gradient-to-br from-[#39291f] to-[#292322] px-4 py-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#523a2d] text-[#ff9b55]"><Flame size={19} fill="currentColor"/></div><div><p className="text-[19px] font-bold leading-none text-[#ffe1c6]">{bestCurrentStreak(habits, todayKey)} days</p><p className="mt-1.5 text-[10px] text-[#c09d83]">your current streak</p></div></div>
          </div>
          <div className="mb-4 flex items-center justify-between"><div><h3 className="text-[16px] font-semibold tracking-[-.02em]">Your routine</h3><p className="mt-1 text-[11px] text-[#92958d]">A few caring things for yourself today</p></div><button onClick={() => setActiveTab("Habits")} className="flex items-center gap-1.5 text-[11px] font-medium text-[#ffad77] hover:text-[#ffd0a9]"><LayoutGrid size={14}/> Manage habits</button></div>
          {habits.length === 0 ? <div className="rounded-2xl border border-dashed border-white/[.14] bg-[#202326] px-6 py-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#303329] text-[#b5f45f]"><Flower2 size={23}/></div><h4 className="mt-4 text-sm font-semibold">Start with one small promise</h4><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[#969990]">Add your first habit and begin building a streak that belongs to you.</p><button onClick={openAdd} className="mt-4 rounded-xl bg-[#f28b55] px-4 py-2 text-xs font-semibold text-[#211915] hover:bg-[#ffa36d]">Create your first habit</button></div> : <div className="space-y-5">{groups.map(group => <div key={group.name}><div className="mb-2 flex items-center gap-2 px-1"><span className="h-1.5 w-1.5 rounded-full bg-[#ff9b55]"/><h4 className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#a3a49c]">{group.name}</h4><span className="text-[10px] text-[#767a73]">{group.habits.filter(h => h.done.has(selectedDate)).length}/{group.habits.length}</span></div><div className="overflow-hidden rounded-2xl border border-white/[.07] bg-[#202326]">{group.habits.map((h, i) => { const checked = h.done.has(selectedDate); return <div key={h.id} className={`flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-white/[.025] sm:px-5 ${i ? "border-t border-white/[.055]" : ""}`}><button aria-label={`${checked ? "Uncomplete" : "Complete"} ${h.name}`} aria-pressed={checked} onClick={() => toggle(h.id)} className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border transition ${checked ? "border-[#b5f45f] bg-[#b5f45f] text-[#20231a] shadow-[0_0_12px_#b5f45f44]" : "border-[#575b5b] bg-[#26292d] hover:border-[#b5f45f]"}`}>{checked && <Check size={13} strokeWidth={2.8}/>}</button><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] text-[19px]" style={{ backgroundColor: `${h.color}24` }}>{h.emoji}</span><div className="min-w-0 flex-1"><p className={`truncate text-[13px] font-medium ${checked ? "text-[#898d86] line-through decoration-[#696e68]" : "text-[#e3e2dc]"}`}>{h.name}</p><p className="mt-1 text-[10px] text-[#92958d]">{h.target} days a week <span className="mx-1">Â·</span> {week.filter(d => h.done.has(d.key)).length} this week</p></div><div className="hidden items-center gap-1.5 rounded-full border border-[#543c2c] bg-[#34271f] px-2.5 py-1 text-[10px] text-[#e7b17e] sm:flex"><Flame size={12} className="text-[#ff9854]" fill="currentColor"/>{streak(h.done, todayKey)} day streak</div><HabitActionMenu onEdit={() => editHabit(h)} onArchive={() => void handleArchive(h)} /></div>; })}</div></div>)}</div>}
          <button onClick={openAdd} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[.14] py-3 text-xs font-medium text-[#a4a59d] transition hover:border-[#f28b55] hover:bg-white/[.025] hover:text-[#ffb37d]"><Plus size={15}/> Add another habit</button>
          <div className="mt-8 flex items-center justify-between border-t border-white/[.07] pt-4 text-[10px] text-[#81847d]"><span>{saveState === "error" ? <button onClick={() => void flushPending()} className="text-[#ff8f9d] underline underline-offset-2">{feedback || "Save failed â€” retry"}</button> : `${habits.length} habits Â· ${saveState === "saved" ? "All changes saved" : "Saving your progressâ€¦"}`}</span><a href="/guide" className="flex items-center gap-1.5 hover:text-[#c7c8c0]"><CircleHelp size={13}/> Project guide</a></div>
          </>}
        </section>
        {activeTab === "Today" && <aside className="space-y-4">
          <div className="rounded-2xl border border-white/[.07] bg-[#202326] p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-[13px] font-semibold">This week</h3><p className="mt-1 text-[10px] text-[#92958d]">{weekLabel}</p></div><div className="flex gap-1"><button onClick={() => { const d = new Date(`${selectedDate}T12:00:00`); d.setDate(d.getDate() - 7); setSelectedDate(dayKey(d)); }} aria-label="Previous week" className="grid h-7 w-7 place-items-center rounded-lg text-[#92958d] hover:bg-white/[.07]"><ChevronLeft size={15}/></button><button disabled={selectedDate >= todayKey} onClick={() => { const d = new Date(`${selectedDate}T12:00:00`); d.setDate(d.getDate() + 7); setSelectedDate(dayKey(d)); }} aria-label="Next week" className="grid h-7 w-7 place-items-center rounded-lg text-[#92958d] hover:bg-white/[.07] disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight size={15}/></button></div></div><div className="grid grid-cols-7 gap-1">{week.map(day => { const selected = selectedDate === day.key; const count = habits.filter(h => h.done.has(day.key)).length; return <button key={day.key} onClick={() => setSelectedDate(day.key)} className={`flex flex-col items-center gap-2 rounded-xl py-2.5 transition ${selected ? "bg-[#b5f45f] text-[#20231a] shadow-[0_0_16px_#b5f45f30]" : "text-[#aaaca5] hover:bg-white/[.06]"}`}><span className={`text-[9px] ${selected ? "text-[#3e4a2b]" : "text-[#888b84]"}`}>{day.day}</span><span className="text-[12px] font-semibold">{day.date}</span><span className={`h-1 w-1 rounded-full ${count ? selected ? "bg-[#49562f]" : "bg-[#b5f45f] shadow-[0_0_5px_#b5f45f]" : "bg-transparent"}`}/></button>; })}</div><div className="mt-4 flex items-center justify-between border-t border-white/[.07] pt-3 text-[10px]"><span className="text-[#92958d]">Weekly progress</span><span className="font-semibold text-[#c8ff78]">{weekPercent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#363a3e]"><div className="h-full rounded-full bg-gradient-to-r from-[#38d996] via-[#b5f45f] to-[#f7c65b] shadow-[0_0_10px_#b5f45f55] transition-all" style={{ width: `${weekPercent}%` }}/></div></div>
          <div className="overflow-hidden rounded-2xl border border-[#404532] bg-gradient-to-br from-[#2b3328] to-[#252b28] p-5"><div className="mb-4 flex items-center justify-between"><span className="rounded-full border border-[#56623d] bg-[#343c2d] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-[#c4ec83]">A gentle reminder</span><Sparkles size={16} className="text-[#c8ed72]"/></div><p className="max-w-[210px] text-[18px] font-medium leading-snug tracking-[-.03em] text-[#eef2e6]">Progress is made of tiny, ordinary moments.</p><div className="mt-4 flex items-end justify-between"><span className="text-[10px] text-[#a9b397]">Take a breath. Begin again.</span><span className="text-[27px]">ðŸŒ±</span></div></div>
          <div className="rounded-2xl border border-white/[.07] bg-[#202326] p-5"><div className="flex items-center justify-between"><div><h3 className="text-[13px] font-semibold">Your little wins</h3><p className="mt-1 text-[10px] text-[#92958d]">Over the last 7 days</p></div><span className="rounded-full bg-[#343025] px-2 py-1 text-[9px] font-semibold text-[#f5c969]">{weekTotal} check-ins</span></div><div className="mt-5 flex h-[100px] items-end justify-between gap-2">{week.map(day => { const count = habits.filter(h => h.done.has(day.key)).length; const bar = habits.length ? Math.max(5, Math.round(count / habits.length * 78)) : 5; return <div key={day.key} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-[78px] w-full items-end"><div className={`w-full rounded-t-md transition-all ${day.key === selectedDate ? "bg-gradient-to-t from-[#f28b55] to-[#ffd166] shadow-[0_0_13px_#f28b5550]" : "bg-gradient-to-t from-[#47775d] to-[#7edb9d]"}`} style={{ height: `${bar}px` }}/></div><span className={`text-[9px] ${day.key === selectedDate ? "font-semibold text-[#f7b06e]" : "text-[#92958d]"}`}>{day.day.slice(0, 1)}</span></div>; })}</div></div>
          <button onClick={() => setActiveTab("Goals")} className="w-full rounded-2xl border border-[#404532] bg-gradient-to-br from-[#2b3328] to-[#252b28] p-4 text-left transition hover:border-[#66754a]"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#303a30] text-[#c4f67a]"><Target size={17}/></div><div className="flex-1"><p className="text-[11px] font-medium">Keep a goal in sight</p><p className="mt-1 text-[10px] text-[#92958d]">Link your habits to a bigger plan.</p></div><ChevronRight size={15} className="text-[#92958d]"/></div></button>
        </aside>}
      </div>
    </div>
    {showForm && <HabitDialog habit={editingHabit} onClose={() => { setShowForm(false); setEditingHabit(null); }} onSave={saveHabit}/>}
  </main>;
}

function FeatureDatabaseNotice() {
  return <section className="mx-auto max-w-xl rounded-2xl border border-[#5b4a32] bg-[#242320] p-6"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#f4a16d]">One-time database update</p><h2 className="mt-2 text-xl font-semibold">Set up this feature</h2><p className="mt-3 text-sm leading-6 text-[#b9bbb4]">The Journal and Goals need migration <code className="text-[#c4f67a]">003_journal_goals_budgets.sql</code>. Saved expense types need migration <code className="text-[#c4f67a]">004_expense_types.sql</code>. In Supabase SQL Editor, run the migration for the feature you opened. Then refresh this page.</p><a href="https://supabase.com/dashboard/project/qsxyotxppoywoyjwfujd/sql" target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-[#f28b55] px-4 py-2.5 text-xs font-semibold text-[#211915] hover:bg-[#ffa36d]">Open Supabase SQL Editor</a></section>;
}

function streak(done: Set<string>, todayKey: string) {
  const date = new Date(`${todayKey}T12:00:00`);
  if (!done.has(dayKey(date))) date.setDate(date.getDate() - 1);
  let count = 0;
  while (done.has(dayKey(date))) { count++; date.setDate(date.getDate() - 1); }
  return count;
}

function bestCurrentStreak(habits: Habit[], todayKey: string) {
  return habits.reduce((best, habit) => Math.max(best, streak(habit.done, todayKey)), 0);
}

function HabitDialog({ habit, onClose, onSave }: { habit: Habit | null; onClose: () => void; onSave: (habit: HabitInput) => Promise<boolean> }) {
  const [name, setName] = useState(habit?.name ?? ""); const [emoji, setEmoji] = useState(habit?.emoji ?? emojis[0]); const [color, setColor] = useState(habit?.color ?? colors[0]); const [category, setCategory] = useState(habit?.category ?? "Other"); const [target, setTarget] = useState(habit?.target ?? 5); const [notes, setNotes] = useState(habit?.notes ?? ""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-[3px]" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="max-h-[92vh] w-full max-w-[470px] overflow-y-auto rounded-[24px] border border-white/10 bg-[#222528] p-6 shadow-2xl shadow-black/50 sm:p-7">
    <div className="mb-6 flex items-start justify-between"><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.16em] text-[#f4a16d]">{habit ? "Tune your routine" : "A new little promise"}</p><h2 id="dialog-title" className="text-[21px] font-semibold tracking-[-.035em]">{habit ? "Edit habit" : "Create a habit"}</h2></div><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-[#a3a49c] hover:bg-white/[.07]"><X size={16}/></button></div>
    <form onSubmit={async e => { e.preventDefault(); if (!name.trim()) return; setBusy(true); setError(""); const ok = await onSave({ name: name.trim(), emoji, color, category, targetDays: target, notes }); setBusy(false); if (!ok) setError(habit ? "Could not save those changes. Please try again." : "Could not add this habit. Please try again."); }} className="space-y-5">
      <label className="block text-[11px] font-medium text-[#b7b9b1]">What would you like to practice?<input autoFocus value={name} onChange={e => setName(e.target.value)} required maxLength={80} placeholder="e.g., Exercise, Read, Meditate" className="mt-2 h-11 w-full rounded-xl border border-white/[.1] bg-[#191b1e] px-3.5 text-[13px] text-[#ecebe7] outline-none placeholder:text-[#777a74] focus:border-[#f28b55]"/></label>
      <div><p className="mb-2 text-[11px] font-medium text-[#b7b9b1]">Pick a little icon</p><div className="grid grid-cols-6 gap-2">{emojis.map(item => <button type="button" key={item} onClick={() => setEmoji(item)} className={`grid h-10 place-items-center rounded-xl border text-lg transition ${item === emoji ? "border-[#f28b55] bg-[#3b2d25] ring-1 ring-[#f28b55]/25" : "border-white/[.08] bg-[#191b1e] hover:bg-white/[.05]"}`}>{item}</button>)}</div></div>
      <div><p className="mb-2 text-[11px] font-medium text-[#b7b9b1]">Choose a color</p><div className="grid grid-cols-10 gap-x-2.5 gap-y-3">{colors.map(c => <button type="button" aria-label={`Choose ${c}`} key={c} onClick={() => setColor(c)} className={`mx-auto h-6 w-6 rounded-full transition ${c === color ? "ring-2 ring-white ring-offset-2 ring-offset-[#222528]" : "hover:scale-110"}`} style={{ background: c }}/>)}</div></div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-4"><label className="block text-[11px] font-medium text-[#b7b9b1]">A little category<select value={category} onChange={e => setCategory(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-white/[.1] bg-[#191b1e] px-3 text-[12px] text-[#e1e0da] outline-none focus:border-[#f28b55]">{["Other", "Movement", "Mindfulness", "Wellbeing", "Reflection", "Health", "Work", "Personal", "Learning"].map(c => <option key={c}>{c}</option>)}</select></label><div><p className="mb-2 text-[11px] font-medium text-[#b7b9b1]">Days / week</p><div className="flex gap-1">{[1,2,3,4,5,6,7].map(n => <button type="button" key={n} onClick={() => setTarget(n)} className={`h-8 w-8 rounded-full text-[11px] ${n === target ? "bg-[#b5f45f] font-semibold text-[#20231a]" : "bg-[#323539] text-[#c4c5be] hover:bg-[#41454a]"}`}>{n}</button>)}</div></div></div>
      <label className="block text-[11px] font-medium text-[#b7b9b1]">Notes <span className="font-normal text-[#858780]">Â· optional</span><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="A gentle reminder to yourself..." className="mt-2 w-full resize-none rounded-xl border border-white/[.1] bg-[#191b1e] p-3 text-[12px] text-[#ecebe7] outline-none placeholder:text-[#777a74] focus:border-[#f28b55]"/></label>
      {error && <p role="alert" className="text-xs text-[#ff8f9d]">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-white/[.08] pt-4"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-[12px] text-[#a5a69e] hover:bg-white/[.06]">Cancel</button><button disabled={busy} type="submit" className="rounded-xl bg-[#f28b55] px-4 py-2 text-[12px] font-semibold text-[#211915] hover:bg-[#ffa36d] disabled:opacity-60">{busy ? "Savingâ€¦" : habit ? "Save changes" : "Add to my routine"}</button></div>
    </form>
  </section></div>;
}
