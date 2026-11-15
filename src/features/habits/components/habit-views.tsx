"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Flame, MoreHorizontal, Pencil, Plus } from "lucide-react";
import type { HabitView } from "@/features/habits/types";

export function HabitActionMenu({ onEdit, onArchive }: { onEdit: () => void; onArchive: () => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toggle = () => {
    if (open) { setOpen(false); return; }
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.max(8, Math.min(rect.right - 168, window.innerWidth - 176));
      const top = rect.bottom + 6 + 92 > window.innerHeight ? Math.max(8, rect.top - 98) : rect.bottom + 6;
      setPosition({ top, left });
    }
    setOpen(true);
  };
  return <><button ref={trigger} aria-label="Habit options" aria-expanded={open} onClick={toggle} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#92958d] hover:bg-white/[.07] hover:text-white"><MoreHorizontal size={17}/></button>{open && createPortal(<><button aria-label="Close habit options" className="fixed inset-0 z-[80] cursor-default" onClick={() => setOpen(false)}/><div role="menu" style={{ top: position.top, left: position.left }} className="fixed z-[81] w-40 rounded-xl border border-white/[.1] bg-[#292c30] p-1.5 shadow-xl shadow-black/40"><button role="menuitem" onClick={() => { setOpen(false); onEdit(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-[#e9e8e2] hover:bg-white/[.07]"><Pencil size={14}/> Edit habit</button><button role="menuitem" onClick={() => { setOpen(false); onArchive(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-[#ffb0a6] hover:bg-[#502e2c]"><Archive size={14}/> Archive habit</button></div></>, document.body)}</>;
}

export function HabitsTable({ habits, todayKey, accountCreatedDate, onAdd, onEdit, onArchive, onToggle }: {
  habits: HabitView[];
  todayKey: string;
  accountCreatedDate: string;
  onAdd: () => void;
  onEdit: (habit: HabitView) => void;
  onArchive: (habit: HabitView) => void;
  onToggle: (habitId: string, date: string) => void;
}) {
  const dates: { key: string; label: string; day: number }[] = [];
  for (const date = new Date(`${accountCreatedDate}T12:00:00`); date <= new Date(`${todayKey}T12:00:00`); date.setDate(date.getDate() + 1)) {
    dates.push({ key: dateKey(date), label: date.toLocaleDateString("en", { month: "short", day: "numeric" }), day: date.getDate() });
  }
  return <section className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#f4a16d]">Your progress</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">Habit tracker</h2></div><button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-[#f28b55] px-4 py-2.5 text-xs font-semibold text-[#211915] hover:bg-[#ffa36d]"><Plus size={15}/> Add habit</button></header>
    {habits.length === 0 ? <div className="rounded-2xl border border-dashed border-white/[.14] bg-[#202326] p-12 text-center text-sm text-[#969990]">Add a habit to begin tracking your streaks.</div> : <div className="overflow-auto rounded-xl border border-white/[.08] bg-[#1d2023] shadow-xl shadow-black/15"><div className="min-w-max">
      <div className="sticky top-0 z-10 flex border-b border-white/[.08] bg-[#1d2023]"><div className="sticky left-0 z-20 flex h-[68px] w-[164px] shrink-0 items-end bg-[#1d2023] px-4 pb-3 text-[9px] font-semibold uppercase tracking-[.14em] text-[#70746f]">Habit</div>{dates.map(date => <div key={date.key} className="flex h-[68px] w-[30px] shrink-0 items-end justify-center pb-2"><span title={date.label} className={`whitespace-nowrap text-[9px] font-medium text-[#828680] ${date.key === todayKey ? "text-[#a78bfa]" : ""}`} style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{date.label}</span></div>)}</div>
      {habits.map(habit => <div key={habit.id} className="group flex border-b border-white/[.055] last:border-0 hover:bg-white/[.015]"><div className="sticky left-0 z-[1] flex h-[38px] w-[164px] shrink-0 items-center gap-2 bg-[#1d2023] px-3 group-hover:bg-[#202326]"><span className="cursor-grab text-[11px] leading-none text-[#656a66]">⠿</span><span className="text-[14px]">{habit.emoji}</span><span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#e7e6e0]" title={habit.name}>{habit.name}</span><span className="text-[11px] font-bold tabular-nums" style={{ color: habit.color }} title={`${streakFor(habit.done, todayKey)} day current streak`}>{streakFor(habit.done, todayKey)}</span><HabitActionMenu onEdit={() => onEdit(habit)} onArchive={() => onArchive(habit)}/></div>{dates.map(date => { const checked = habit.done.has(date.key); const today = date.key === todayKey; return <div key={date.key} className="flex h-[38px] w-[30px] shrink-0 items-center justify-center"><button onClick={() => onToggle(habit.id, date.key)} aria-label={`${checked ? "Unmark" : "Mark"} ${habit.name} on ${date.label}`} aria-pressed={checked} className={`h-[27px] w-[27px] rounded-[6px] border transition-all ${checked ? "scale-[.96] border-transparent" : "border-[#3a3d40] bg-[#25272a] hover:border-[#6e7476] hover:bg-[#2b2e32]"} ${today && !checked ? "border-[#718cff]" : ""}`} style={checked ? { backgroundColor: habit.color || "#8b5cf6", boxShadow: `0 0 9px ${habit.color || "#8b5cf6"}66` } : undefined}/></div>; })}</div>)}
    </div></div>}
    <p className="text-[10px] text-[#777b75]">{new Date(`${accountCreatedDate}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })} – {new Date(`${todayKey}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })} · Click a square to update a completion.</p>
  </section>;
}

export function HabitCalendar({ habits, todayKey, accountCreatedDate, onEdit, onArchive, onToggle }: {
  habits: HabitView[];
  todayKey: string;
  accountCreatedDate: string;
  onEdit: (habit: HabitView) => void;
  onArchive: (habit: HabitView) => void;
  onToggle: (habitId: string, date: string) => void;
}) {
  const firstDate = new Date(`${accountCreatedDate}T12:00:00`);
  const lastDate = new Date(`${todayKey}T12:00:00`);
  const firstWeek = new Date(firstDate); firstWeek.setDate(firstWeek.getDate() - firstWeek.getDay());
  const weeks: { days: Date[]; month: string }[] = [];
  for (const weekStart = new Date(firstWeek); weekStart <= lastDate; weekStart.setDate(weekStart.getDate() + 7)) {
    const days = Array.from({ length: 7 }, (_, i) => { const date = new Date(weekStart); date.setDate(weekStart.getDate() + i); return date; });
    const monthStart = days.find(date => date.getDate() === 1 && date >= firstDate && date <= lastDate);
    const month = monthStart ? monthStart.toLocaleDateString("en", { month: "short" }) : weeks.length === 0 ? firstDate.toLocaleDateString("en", { month: "short" }) : "";
    weeks.push({ days, month });
  }

  return <section className="space-y-4">
    <header><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#f4a16d]">Account history</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">Habit calendar</h2><p className="mt-1 text-xs text-[#92958d]">Every check-in since you joined.</p></header>
    {habits.length === 0 ? <div className="rounded-2xl border border-dashed border-white/[.14] bg-[#202326] p-10 text-center text-sm text-[#969990]">Your habit calendar will appear when you add a habit.</div> : <div className="space-y-3">{habits.map(habit => {
      const current = streakFor(habit.done, todayKey);
      const best = bestStreakFor(habit.done);
      const habitStart = habit.createdAt > accountCreatedDate ? habit.createdAt : accountCreatedDate;
      const elapsed = Math.max(1, daysBetween(habitStart, todayKey) + 1);
      const goal = Math.max(1, Math.round(habit.target * elapsed / 7));
      const percent = Math.min(100, Math.round(habit.done.size / goal * 100));
      return <article key={habit.id} className="overflow-hidden rounded-xl border border-white/[.09] bg-[#1e2023] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full border border-white/[.1] bg-[#191b1e] text-lg">{habit.emoji}</span><div className="min-w-0 flex-1"><h3 className="truncate text-[13px] font-semibold">{habit.name}</h3><div className="mt-1 flex flex-wrap items-center gap-1.5"><span className={`rounded-full px-2 py-0.5 text-[9px] ${current ? "bg-[#20372a] text-[#67d889]" : "bg-[#302622] text-[#ef786d]"}`}>{current ? `${current} day streak` : "No streak"}</span><span className="rounded-full bg-white/[.06] px-2 py-0.5 text-[9px] text-[#a7a8a0]">Best: {best}</span><span className="rounded-full bg-white/[.06] px-2 py-0.5 text-[9px] text-[#a7a8a0]">{percent}%</span></div></div><HabitActionMenu onEdit={() => onEdit(habit)} onArchive={() => onArchive(habit)}/></div>
        <div className="mt-5 overflow-x-auto pb-1"><div className="min-w-max"><div className="mb-1 ml-[34px] flex gap-[3px]">{weeks.map((week, index) => <div key={index} className="h-4 w-[13px] overflow-visible text-[9px] leading-none text-[#81847e]">{week.month}</div>)}</div><div className="flex"><div className="mr-2 flex w-[26px] shrink-0 flex-col gap-[3px] pt-0.5 text-[8px] leading-[13px] text-[#797c76]">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day}>{day}</span>)}</div><div className="flex gap-[3px]">{weeks.map((week, weekIndex) => <div key={weekIndex} className="flex w-[13px] shrink-0 flex-col gap-[3px]">{week.days.map(date => {
          const key = dateKey(date); const valid = key >= accountCreatedDate && key <= todayKey; const checked = habit.done.has(key); const today = key === todayKey;
          return valid ? <button key={key} title={`${date.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}${checked ? " · Completed" : " · Not completed"}`} aria-label={`${habit.name}, ${key}, ${checked ? "completed" : "not completed"}`} aria-pressed={checked} onClick={() => onToggle(habit.id, key)} className={`h-[13px] w-[13px] rounded-[3px] border ${checked ? "border-transparent" : "border-[#383b3f] bg-[#282a2d] hover:border-[#777b7e]"} ${today ? "outline outline-1 outline-[#718cff] outline-offset-1" : ""}`} style={checked ? { backgroundColor: habit.color || "#8b5cf6" } : undefined}/> : <span key={key} className="h-[13px] w-[13px] rounded-[3px] bg-transparent"/>;
        })}</div>)}</div></div><div className="mt-3 flex items-center justify-end gap-1 text-[9px] text-[#81847e]"><span className="mr-1">Less</span><span className="h-[11px] w-[11px] rounded-[3px] border border-[#383b3f] bg-[#282a2d]"/><span className="h-[11px] w-[11px] rounded-[3px] opacity-45" style={{ backgroundColor: habit.color }}/><span className="h-[11px] w-[11px] rounded-[3px] opacity-75" style={{ backgroundColor: habit.color }}/><span className="h-[11px] w-[11px] rounded-[3px]" style={{ backgroundColor: habit.color }}/><span className="ml-1">More</span></div></div></div>
      </article>;
    })}</div>}
  </section>;
}

export function HabitInsights({ habits, todayKey }: { habits: HabitView[]; todayKey: string }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const end = new Date(`${todayKey}T12:00:00`);
  const start = period === "week" ? new Date(end) : new Date(end.getFullYear(), end.getMonth(), 1, 12);
  if (period === "week") start.setDate(start.getDate() - 6);
  const dates: { key: string; label: string; short: string }[] = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push({ key: dateKey(date), label: date.toLocaleDateString("en", { month: "short", day: "numeric" }), short: period === "week" ? date.toLocaleDateString("en", { weekday: "short" }) : String(date.getDate()) });
  }
  const series = dates.map(date => ({ ...date, count: habits.filter(h => h.done.has(date.key)).length }));
  const checkins = series.reduce((sum, item) => sum + item.count, 0);
  const opportunityCount = habits.reduce((sum, habit) => sum + habit.target, 0) * dates.length / 7;
  const completionRate = opportunityCount ? Math.min(100, Math.round(checkins / opportunityCount * 100)) : 0;
  const perfectDays = series.filter(item => habits.length > 0 && item.count === habits.length).length;
  const longest = habits.reduce((best, habit) => Math.max(best, streakFor(habit.done, todayKey)), 0);
  const rangeLabel = period === "week" ? "Last 7 days" : end.toLocaleDateString("en", { month: "long", year: "numeric" });

  return <section className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#c8ff78]">Your progress</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.04em]">Insights</h2><p className="mt-2 text-sm text-[#969990]">A clear look at the effort you’re putting in.</p></div><div className="flex rounded-xl border border-white/[.08] bg-[#202326] p-1">{(["week", "month"] as const).map(item => <button key={item} onClick={() => setPeriod(item)} className={`rounded-lg px-3.5 py-2 text-xs font-medium capitalize transition ${period === item ? "bg-[#b5f45f] text-[#20231a]" : "text-[#a3a49c] hover:text-white"}`}>{item === "week" ? "Weekly" : "Monthly"}</button>)}</div></header>
    <div className="grid gap-4 sm:grid-cols-3"><MetricCard label={`${period === "week" ? "Weekly" : "Monthly"} completion`} value={`${completionRate}%`} detail={rangeLabel} color="lime"/><MetricCard label="Check-ins completed" value={String(checkins)} detail={`Across ${habits.length} active ${habits.length === 1 ? "habit" : "habits"}`} color="orange"/><MetricCard label="Longest active streak" value={`${longest} days`} detail={`${perfectDays} ${perfectDays === 1 ? "day" : "days"} with every habit done`} color="violet"/></div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(270px,.75fr)]">
      <div className="rounded-2xl border border-white/[.08] bg-[#202326] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{period === "week" ? "Daily check-ins" : "Daily progress this month"}</h3><p className="mt-1 text-[11px] text-[#92958d]">Completed habit check-ins per day · {rangeLabel}</p></div><span className="rounded-full bg-[#30392a] px-2.5 py-1 text-[10px] font-semibold text-[#cbf67f]">{checkins} total</span></div><ProgressBars series={series} max={Math.max(habits.length, 1)} period={period}/></div>
      <div className="rounded-2xl border border-white/[.08] bg-[#202326] p-5 sm:p-6"><h3 className="text-sm font-semibold">Target completion</h3><p className="mt-1 text-[11px] text-[#92958d]">Check-ins compared with your weekly goals</p><div className="flex min-h-[230px] flex-col items-center justify-center"><Donut percentage={completionRate} label={period === "week" ? "this week" : "this month"}/><p className="mt-4 max-w-[210px] text-center text-xs leading-relaxed text-[#a3a49c]">{completionRate >= 80 ? "You’re building serious momentum. Keep that rhythm going." : completionRate >= 45 ? "You’re showing up consistently. Every check-in counts." : "There’s room to grow. Pick one habit and start a streak today."}</p></div><div className="flex justify-center gap-4 text-[10px] text-[#969990]"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#b5f45f]"/>Completed</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#3b3f43]"/>Remaining</span></div></div>
    </div>
    <div className="rounded-2xl border border-white/[.08] bg-[#202326] p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Habit breakdown</h3><p className="mt-1 text-[11px] text-[#92958d]">Progress toward each habit’s weekly target</p></div></div>{habits.length ? <div className="space-y-4">{habits.map(habit => { const count = series.reduce((sum, item) => sum + Number(habit.done.has(item.key)), 0); const target = Math.max(1, Math.round(habit.target * dates.length / 7)); const pct = Math.min(100, Math.round(count / target * 100)); return <div key={habit.id} className="grid grid-cols-[minmax(120px,1fr)_minmax(80px,2fr)_52px] items-center gap-3"><div className="flex min-w-0 items-center gap-2"><span className="text-base">{habit.emoji}</span><span className="truncate text-xs text-[#d9d8d2]">{habit.name}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#383c40]"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${habit.color}, #c8ff5e)` }}/></div><span className="text-right text-[10px] font-semibold text-[#c7f279]">{count}/{target}</span></div>; })}</div> : <p className="py-8 text-center text-sm text-[#92958d]">Add a habit to see its progress here.</p>}</div>
  </section>;
}

function MetricCard({ label, value, detail, color }: { label: string; value: string; detail: string; color: "lime" | "orange" | "violet" }) {
  const accent = color === "lime" ? "text-[#c8ff78] bg-[#30392a]" : color === "orange" ? "text-[#ffad76] bg-[#3a2b23]" : "text-[#c4a4ff] bg-[#30283d]";
  return <div className="rounded-2xl border border-white/[.08] bg-[#202326] p-5"><p className="text-[11px] font-medium text-[#a0a198]">{label}</p><p className={`mt-3 inline-flex rounded-lg px-2.5 py-1 text-2xl font-bold tracking-tight ${accent}`}>{value}</p><p className="mt-3 text-[10px] text-[#858880]">{detail}</p></div>;
}

function Donut({ percentage, label }: { percentage: number; label: string }) {
  return <div className="relative grid h-40 w-40 place-items-center rounded-full" style={{ background: `conic-gradient(#b5f45f 0 ${percentage}%, #3b3f43 ${percentage}% 100%)`, filter: "drop-shadow(0 0 18px #b5f45f18)" }}><div className="grid h-[112px] w-[112px] place-items-center rounded-full bg-[#202326]"><div className="text-center"><p className="text-3xl font-bold tracking-tight text-[#eff1e9]">{percentage}%</p><p className="mt-1 text-[10px] text-[#969990]">{label}</p></div></div></div>;
}

function ProgressBars({ series, max, period }: { series: { key: string; label: string; short: string; count: number }[]; max: number; period: "week" | "month" }) {
  const width = 760, height = 260, top = 18, bottom = 44, left = 34, right = 8;
  const chartHeight = height - top - bottom, chartWidth = width - left - right;
  const slot = chartWidth / Math.max(1, series.length);
  const barWidth = Math.min(period === "week" ? 46 : 15, slot * (period === "week" ? .56 : .7));
  const labelIndexes = period === "week" ? series.map((_, i) => i) : series.map((_, i) => i).filter(i => i % 5 === 0 || i === series.length - 1);
  return <div className="mt-5 overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className={`w-full ${period === "month" ? "min-w-[650px]" : "min-w-[420px]"}`} role="img" aria-label={`${period} daily habit completions bar chart`}>
    <defs><linearGradient id="habit-bar" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#38d996"/><stop offset="100%" stopColor="#c8ff5e"/></linearGradient><filter id="bar-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    {[0, .25, .5, .75, 1].map(fraction => { const y = top + chartHeight * fraction; return <g key={fraction}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#ffffff12" strokeDasharray={fraction === 1 ? "0" : "4 6"}/><text x={left - 8} y={y + 4} textAnchor="end" fill="#777b75" fontSize="10">{Math.round(max * (1 - fraction))}</text></g>; })}
    {series.map((item, i) => { const value = item.count / Math.max(max, 1); const barHeight = Math.max(item.count ? 4 : 0, value * chartHeight); const x = left + i * slot + (slot - barWidth) / 2; const y = top + chartHeight - barHeight; const selected = i === series.length - 1; return <g key={item.key}><title>{item.label}: {item.count} check-ins</title><rect x={x} y={y} width={barWidth} height={barHeight} rx={Math.min(7, barWidth / 2)} fill="url(#habit-bar)" opacity={selected ? 1 : .74} filter={selected && item.count ? "url(#bar-glow)" : undefined}/>{labelIndexes.includes(i) && <text x={left + i * slot + slot / 2} y={height - 13} textAnchor="middle" fill={selected ? "#c8ff78" : "#858880"} fontSize={period === "week" ? 10 : 9}>{item.short}</text>}</g>; })}
  </svg></div>;
}

function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function streakFor(done: Set<string>, todayKey: string) { const date = new Date(`${todayKey}T12:00:00`); if (!done.has(dateKey(date))) date.setDate(date.getDate() - 1); let n = 0; while (done.has(dateKey(date))) { n++; date.setDate(date.getDate() - 1); } return n; }
function bestStreakFor(done: Set<string>) { let best = 0, current = 0, previous: Date | null = null; for (const key of Array.from(done).sort()) { const date = new Date(`${key}T12:00:00`); if (!previous) current = 1; else { const expected = new Date(previous); expected.setDate(expected.getDate() + 1); current = dateKey(expected) === key ? current + 1 : 1; } best = Math.max(best, current); previous = date; } return best; }
function daysBetween(start: string, end: string) { return Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000); }
