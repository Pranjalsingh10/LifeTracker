"use client";

import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, NotebookPen, Save } from "lucide-react";
import { saveJournalEntry } from "@/features/journal/actions";

export type JournalRecord = { id: string; entry_date: string; title: string | null; body: string; mood: string | null; updated_at: string };

function readableDate(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function moveDate(key: string, amount: number) {
  const date = new Date(`${key}T12:00:00`); date.setDate(date.getDate() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function JournalView({ initialEntries, todayKey }: { initialEntries: JournalRecord[]; todayKey: string }) {
  const [entries, setEntries] = useState(initialEntries);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [title, setTitle] = useState(initialEntries.find(entry => entry.entry_date === todayKey)?.title ?? "");
  const [body, setBody] = useState(initialEntries.find(entry => entry.entry_date === todayKey)?.body ?? "");
  const [mood, setMood] = useState(initialEntries.find(entry => entry.entry_date === todayKey)?.mood ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const chooseDate = (date: string) => {
    const entry = entries.find(item => item.entry_date === date);
    setSelectedDate(date); setTitle(entry?.title ?? ""); setBody(entry?.body ?? ""); setMood(entry?.mood ?? ""); setMessage("");
  };
  const save = async () => {
    setSaving(true); setMessage("");
    const result = await saveJournalEntry({ date: selectedDate, title, body, mood });
    setSaving(false);
    if (!result.ok) { setMessage(result.error); return; }
    setEntries(current => [result.entry, ...current.filter(entry => entry.entry_date !== selectedDate)].sort((a, b) => b.entry_date.localeCompare(a.entry_date)));
    setMessage("Saved to your notebook.");
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[.14em] text-[#f4a16d]">Your private notebook</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Journal</h2><p className="mt-2 text-sm text-[#999c95]">Write a little about your day. Your notes are saved to your account.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#342d28] text-[#f4ad7a]"><NotebookPen size={22}/></div></div>
    <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/[.08] bg-[#202326] p-4"><h3 className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold"><BookOpen size={16} className="text-[#c4f67a]"/> Notebook dates</h3><label className="mb-3 block text-[10px] text-[#92958d]">Choose a day<input type="date" value={selectedDate} max={todayKey} onChange={event => chooseDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-white/[.09] bg-[#191b1e] px-3 text-xs text-[#e9e9e4] outline-none focus:border-[#c4f67a]"/></label><div className="mb-3 flex items-center gap-2"><button aria-label="Previous day" onClick={() => chooseDate(moveDate(selectedDate, -1))} className="grid h-8 w-8 place-items-center rounded-lg bg-[#292c30] text-[#adb0a7] hover:bg-[#34383c]"><ChevronLeft size={16}/></button><button aria-label="Next day" disabled={selectedDate >= todayKey} onClick={() => chooseDate(moveDate(selectedDate, 1))} className="grid h-8 w-8 place-items-center rounded-lg bg-[#292c30] text-[#adb0a7] hover:bg-[#34383c] disabled:opacity-40"><ChevronRight size={16}/></button><button onClick={() => chooseDate(todayKey)} className="ml-auto text-[11px] text-[#c4f67a]">Today</button></div><div className="max-h-[480px] space-y-1 overflow-y-auto">{entries.length ? entries.map(entry => <button key={entry.id} onClick={() => chooseDate(entry.entry_date)} className={`w-full rounded-xl p-3 text-left transition ${selectedDate === entry.entry_date ? "bg-[#30352c]" : "hover:bg-white/[.04]"}`}><span className="block text-[10px] text-[#a2a59c]">{readableDate(entry.entry_date)}</span><span className="mt-1 block truncate text-xs font-medium text-[#e1e2dc]">{entry.title || entry.body.slice(0, 55) || "Untitled note"}</span></button>) : <p className="rounded-xl border border-dashed border-white/[.1] p-4 text-center text-xs leading-5 text-[#8f938b]">Your saved notes will appear here.</p>}</div></aside>
      <section className="rounded-2xl border border-white/[.08] bg-[#202326] p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] pb-4"><div><p className="text-[10px] uppercase tracking-[.14em] text-[#f4a16d]">Daily entry</p><h3 className="mt-1 text-lg font-semibold">{readableDate(selectedDate)}</h3></div><label className="text-[10px] text-[#92958d]">How are you feeling?<select value={mood} onChange={event => setMood(event.target.value)} className="mt-1 block h-9 rounded-lg border border-white/[.09] bg-[#191b1e] px-2 text-xs text-[#e9e9e4] outline-none"><option value="">Choose a mood</option>{["Great", "Good", "Okay", "Low", "Tired", "Grateful"].map(item => <option key={item}>{item}</option>)}</select></label></div><input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder="Give today a title..." className="mt-5 w-full border-0 bg-transparent text-xl font-semibold text-[#ecebe7] outline-none placeholder:text-[#676b65]"/><textarea value={body} onChange={event => setBody(event.target.value)} placeholder="What happened today? What did you learn? Write freely..." className="mt-4 min-h-[320px] w-full resize-y rounded-xl border border-white/[.06] bg-[#191b1e] p-4 text-sm leading-7 text-[#d7d9d2] outline-none placeholder:text-[#686c66] focus:border-[#c4f67a]/40"/><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p role="status" className={`text-xs ${message.startsWith("Saved") ? "text-[#bce875]" : "text-[#ff9b9b]"}`}>{message}</p><button onClick={() => void save()} disabled={saving || (!title.trim() && !body.trim())} className="inline-flex items-center gap-2 rounded-xl bg-[#c4f67a] px-4 py-2.5 text-xs font-semibold text-[#20231a] hover:bg-[#d4ff8a] disabled:opacity-50"><Save size={14}/>{saving ? "Saving..." : "Save entry"}</button></div></section>
    </div>
  </div>;
}
