"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, Check, ChevronDown, CreditCard, IndianRupee, Plus, ReceiptText, Save, Trash2, Wallet, X } from "lucide-react";
import { addExpense, createExpenseType, deleteExpense, saveMonthlyBudget } from "@/features/finance/actions";

export type ExpenseRecord = { id: string; product: string; amount_minor: number; currency: string; occurred_on: string; spent_at: string; payment_method: string; category: string; created_at: string };
export type ExpenseTypeRecord = { id: string; name: string };
const defaultTypes = ["Food", "Travel", "Shopping", "Bills", "Health", "Entertainment", "Transport"];
const chartColors = ["#f28b55", "#b5f45f", "#8f70f5", "#45b8ac", "#f1c35b", "#e86c93", "#5598e8", "#a1a88c", "#da9b66", "#7882ad"];
const money = (minor: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(minor / 100);
const timeNow = () => `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;

type PieSlice = { name: string; total: number; color: string; start: number; end: number; offsetX: number; offsetY: number };
const piePoint = (angle: number, offsetX = 0, offsetY = 0) => ({ x: 160 + offsetX + 112 * Math.cos(angle), y: 92 + offsetY + 67 * Math.sin(angle) });
const darken = (hex: string, amount = 0.48) => `#${[1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * amount).toString(16).padStart(2, "0")).join("")}`;

function getPieSlices(items: { name: string; total: number }[], total: number): PieSlice[] {
  const chartItems = items.length ? items : [{ name: "No spending yet", total: 1 }];
  let angle = -Math.PI / 2;
  return chartItems.map((item, index) => {
    const sweep = total ? item.total / total * Math.PI * 2 : Math.PI * 2;
    const middle = angle + sweep / 2;
    const offset = chartItems.length > 1 ? 5 : 0;
    const slice = { ...item, color: items.length ? chartColors[index % chartColors.length] : "#41464b", start: angle, end: angle + sweep, offsetX: Math.cos(middle) * offset, offsetY: Math.sin(middle) * offset * .68 };
    angle += sweep;
    return slice;
  });
}

function sliceTopPath(slice: PieSlice) {
  const start = piePoint(slice.start, slice.offsetX, slice.offsetY);
  const end = piePoint(slice.end, slice.offsetX, slice.offsetY);
  const sweep = slice.end - slice.start;
  if (sweep > Math.PI * 2 - .001) {
    const right = piePoint(0, slice.offsetX, slice.offsetY);
    const left = piePoint(Math.PI, slice.offsetX, slice.offsetY);
    return `M ${right.x} ${right.y} A 112 67 0 1 1 ${left.x} ${left.y} A 112 67 0 1 1 ${right.x} ${right.y} Z`;
  }
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${160 + slice.offsetX} ${92 + slice.offsetY} L ${start.x} ${start.y} A 112 67 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function sliceWallPaths(slice: PieSlice) {
  const paths: string[] = [];
  for (const shift of [-1, 0, 1]) {
    const from = Math.max(slice.start, shift * Math.PI * 2);
    const to = Math.min(slice.end, Math.PI + shift * Math.PI * 2);
    if (to - from < .005) continue;
    const steps = Math.max(3, Math.ceil((to - from) / (Math.PI / 18)));
    const upper = Array.from({ length: steps + 1 }, (_, index) => piePoint(from + (to - from) * index / steps, slice.offsetX, slice.offsetY));
    const lower = [...upper].reverse().map(point => ({ x: point.x, y: point.y + 27 }));
    paths.push(`M ${upper.map(point => `${point.x} ${point.y}`).join(" L ")} L ${lower.map(point => `${point.x} ${point.y}`).join(" L ")} Z`);
  }
  return paths;
}

function ExpensePieChart({ items, total }: { items: { name: string; total: number }[]; total: number }) {
  const slices = getPieSlices(items, total);
  const detail = items.length ? items.map(item => `${item.name}: ${money(item.total)}`).join("; ") : "No expenses recorded yet";
  return <svg className="h-auto w-full overflow-visible" viewBox="0 0 320 232" role="img" aria-label={`Exploded 3D pie chart of spending by type. Total ${money(total)}. ${detail}`}>
    <defs>
      <filter id="pie-shadow" x="-20%" y="-20%" width="150%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#000000" floodOpacity=".32"/></filter>
      {slices.map((slice, index) => <linearGradient key={slice.name} id={`pie-top-${index}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity=".3"/><stop offset="45%" stopColor={slice.color}/><stop offset="100%" stopColor={darken(slice.color, .82)}/></linearGradient>)}
    </defs>
    <g filter="url(#pie-shadow)">
      {slices.flatMap((slice, index) => sliceWallPaths(slice).map((path, wallIndex) => <path key={`wall-${index}-${wallIndex}`} d={path} fill={darken(slice.color)} stroke={darken(slice.color, .38)} strokeWidth="1"/>))}
      {slices.map((slice, index) => <path key={slice.name} d={sliceTopPath(slice)} fill={`url(#pie-top-${index})`} stroke="var(--auth-panel)" strokeWidth="2.5" strokeLinejoin="round" className="expense-pie-slice"><title>{`${slice.name}: ${money(slice.total)}`}</title></path>)}
    </g>
  </svg>;
}

export function ExpensesView({ todayKey, monthStart, initialExpenses, initialExpenseTypes, initialBudgetMinor }: { todayKey: string; monthStart: string; initialExpenses: ExpenseRecord[]; initialExpenseTypes: ExpenseTypeRecord[]; initialBudgetMinor: number }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [expenseTypes, setExpenseTypes] = useState(initialExpenseTypes);
  const [budget, setBudget] = useState(initialBudgetMinor);
  const [budgetDraft, setBudgetDraft] = useState(initialBudgetMinor ? String(initialBudgetMinor / 100) : "");
  const [product, setProduct] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayKey);
  const [time, setTime] = useState(timeNow());
  const [category, setCategory] = useState("Food");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [newType, setNewType] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const spent = useMemo(() => expenses.reduce((total, expense) => total + Number(expense.amount_minor), 0), [expenses]);
  const remaining = budget - spent;
  const used = budget > 0 ? Math.min(100, spent / budget * 100) : 0;
  const monthLabel = new Date(`${monthStart}T12:00:00`).toLocaleDateString("en", { month: "long", year: "numeric" });
  const spendingByType = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      const type = expense.category?.trim() || "Other";
      totals.set(type, (totals.get(type) ?? 0) + Number(expense.amount_minor));
    }
    return [...totals.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [expenses]);
  const availableTypes = [...defaultTypes, ...expenseTypes.map(type => type.name).filter(name => name.toLowerCase() !== "other" && !defaultTypes.some(item => item.toLowerCase() === name.toLowerCase()))];

  const saveBudget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minor = Math.round(Number(budgetDraft) * 100);
    if (!Number.isFinite(minor) || minor < 0) { setMessage("Enter a valid budget amount."); return; }
    setBusy(true); setMessage("");
    const result = await saveMonthlyBudget(monthStart, minor);
    setBusy(false);
    if (!result.ok) { setMessage(result.error ?? "Could not save the monthly budget."); return; }
    setBudget(minor); setMessage("Monthly budget saved.");
  };

  const add = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(minor) || minor <= 0) { setMessage("Enter an amount greater than zero."); return; }
    setBusy(true); setMessage("");
    const result = await addExpense({ product, amountMinor: minor, date, time, paymentMethod, category });
    setBusy(false);
    if (!result.ok) { setMessage(result.error ?? "Could not add this expense."); return; }
    setExpenses(items => [result.expense as ExpenseRecord, ...items].sort((a, b) => `${b.occurred_on} ${b.spent_at}`.localeCompare(`${a.occurred_on} ${a.spent_at}`)));
    setProduct(""); setAmount(""); setDate(todayKey); setTime(timeNow()); setMessage("Expense added.");
  };

  const saveType = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setMessage("");
    const result = await createExpenseType(newType);
    setBusy(false);
    if (!result.ok) { setMessage(result.error ?? "Could not save this type."); return; }
    const savedType = result.expenseType as ExpenseTypeRecord;
    setExpenseTypes(types => [...types, savedType].sort((a, b) => a.name.localeCompare(b.name)));
    setCategory(savedType.name); setNewType(""); setShowTypeForm(false); setMessage("Expense type saved to your account.");
  };

  const remove = async (expense: ExpenseRecord) => {
    const result = await deleteExpense(expense.id);
    if (!result.ok) { setMessage(result.error ?? "Could not delete this expense."); return; }
    setExpenses(items => items.filter(item => item.id !== expense.id));
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[.14em] text-[#f4a16d]">Know where it goes</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Expense calculator</h2><p className="mt-2 text-sm text-[#999c95]">Track this month's spending and see your budget update at once.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#342d28] text-[#f4ad7a]"><Wallet size={22}/></div></div>

    <div className="grid gap-3 md:grid-cols-3">
      <article className="rounded-2xl border border-white/[.08] bg-[#202326] p-5"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#92958d]">Monthly budget · {monthLabel}</p><div className="mt-3 flex items-center gap-2"><IndianRupee size={18} className="text-[#c4f67a]"/><p className="text-2xl font-bold">{money(budget)}</p></div><form onSubmit={saveBudget} className="mt-3 flex gap-2"><input type="number" min="0" step="0.01" value={budgetDraft} onChange={event => setBudgetDraft(event.target.value)} placeholder="Set budget in ₹" className="h-9 min-w-0 flex-1 rounded-lg border border-white/[.09] bg-[#191b1e] px-3 text-xs outline-none focus:border-[#c4f67a]"/><button disabled={busy} aria-label="Save monthly budget" className="grid h-9 w-9 place-items-center rounded-lg bg-[#c4f67a] text-[#20231a] disabled:opacity-50"><Save size={14}/></button></form></article>
      <article className="rounded-2xl border border-white/[.08] bg-[#202326] p-5"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#92958d]">Spent this month</p><p className="mt-3 text-2xl font-bold text-[#ffb487]">{money(spent)}</p><p className="mt-2 text-[10px] text-[#92958d]">{expenses.length} purchases recorded</p></article>
      <article className={`rounded-2xl border p-5 ${remaining < 0 ? "border-[#643b3b] bg-[#2d2223]" : "border-[#394b34] bg-[#222a23]"}`}><p className="text-[10px] font-semibold uppercase tracking-wider text-[#a5ab9d]">{remaining < 0 ? "Over budget by" : "Left to spend"}</p><p className={`mt-3 text-2xl font-bold ${remaining < 0 ? "text-[#ff8888]" : "text-[#c4f67a]"}`}>{money(Math.abs(remaining))}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25"><div className={`h-full rounded-full transition-all ${remaining < 0 ? "bg-gradient-to-r from-[#ff9d59] to-[#ff6464]" : "bg-gradient-to-r from-[#36d399] to-[#c4f67a]"}`} style={{ width: `${used}%` }}/></div><p className="mt-1.5 text-right text-[9px] text-[#92958d]">{budget ? `${Math.round(spent / budget * 100)}% used` : "Set a budget to track your limit"}</p></article>
    </div>

    <section className="grid min-w-0 gap-6 overflow-hidden rounded-2xl border border-white/[.08] bg-[#202326] p-5 sm:p-6 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)] lg:items-center">
      <div className="min-w-0"><h3 className="flex items-center gap-2 text-sm font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#342d28] text-[#f4ad7a]"><IndianRupee size={16}/></span>Spent by Type</h3><p className="mt-1 text-[10px] text-[#92958d]">Purchase totals for {monthLabel}</p><div className="mx-auto mt-3 w-full max-w-[320px]"><ExpensePieChart items={spendingByType} total={spent}/></div><div className="mt-1 flex items-baseline justify-between border-t border-white/[.07] pt-3"><span className="text-[10px] uppercase tracking-wider text-[#92958d]">Total spent</span><strong className="text-sm font-bold text-[#f4ad7a]">{money(spent)}</strong></div></div>
      <div className="min-w-0"><p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#92958d]">Type breakdown</p>{spendingByType.length ? <div className="grid gap-2 sm:grid-cols-2">{spendingByType.map((item, index) => <div key={item.name} className="rounded-xl border border-white/[.06] bg-[#191b1e] p-3"><div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 truncate text-xs font-medium"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }}/>{item.name}</span><span className="shrink-0 text-xs text-[#d8d9d2]">{money(item.total)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full" style={{ width: `${spent ? item.total / spent * 100 : 0}%`, backgroundColor: chartColors[index % chartColors.length] }}/></div><p className="mt-1 text-right text-[9px] text-[#858981]">{spent ? Math.round(item.total / spent * 100) : 0}%</p></div>)}</div> : <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-white/[.1] text-center text-xs text-[#92958d]">Add purchases to see your type breakdown.</div>}</div>
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-[#202326] p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#342d28] text-[#f4ad7a]"><Plus size={16}/></span><div><h3 className="text-sm font-semibold">Add a purchase</h3><p className="mt-0.5 text-[10px] text-[#92958d]">Enter the amount and what you spent it on.</p></div></div>
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.35fr_.85fr_1fr_1fr_.9fr_1.1fr_auto]">
        <label className="text-[10px] text-[#92958d]">Product<input required maxLength={120} value={product} onChange={event => setProduct(event.target.value)} placeholder="e.g., Groceries" className="mt-1.5 h-10 w-full rounded-lg border border-white/[.09] bg-[#191b1e] px-3 text-xs text-white outline-none focus:border-[#f4ad7a]"/></label>
        <label className="text-[10px] text-[#92958d]">Amount (₹)<input required type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className="mt-1.5 h-10 w-full rounded-lg border border-white/[.09] bg-[#191b1e] px-3 text-xs text-white outline-none focus:border-[#f4ad7a]"/></label>
        <div className="relative text-[10px] text-[#92958d]"><label id="expense-type-label">Type</label><button type="button" role="combobox" aria-labelledby="expense-type-label" aria-expanded={typeMenuOpen} onClick={() => setTypeMenuOpen(open => !open)} className="mt-1.5 flex h-10 w-full items-center justify-between rounded-lg border border-white/[.09] bg-[#191b1e] px-3 text-left text-xs text-white outline-none focus:border-[#f4ad7a]"><span className="truncate">{category}</span><ChevronDown size={14}/></button>{typeMenuOpen && <div role="listbox" aria-labelledby="expense-type-label" className="absolute left-0 right-0 top-full z-20 max-h-64 overflow-y-auto rounded-xl border border-white/[.12] bg-[#202326] p-1.5 shadow-xl">{availableTypes.map(type => <button type="button" role="option" aria-selected={type === category} key={type} onClick={() => { setCategory(type); setTypeMenuOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs text-[#e8e7e1] hover:bg-white/[.06]">{type}{type === category && <Check size={13} className="text-[#c4f67a]"/>}</button>)}<div className="my-1 border-t border-white/[.08]"/><button type="button" onClick={() => { setTypeMenuOpen(false); setShowTypeForm(true); setNewType(""); setMessage(""); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[#f4ad7a] hover:bg-white/[.06]"><Plus size={14}/> Add more</button></div>}</div>
        <label className="text-[10px] text-[#92958d]">Date<input required type="date" min={monthStart} max={todayKey} value={date} onChange={event => setDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-white/[.09] bg-[#191b1e] px-3 text-xs text-white outline-none focus:border-[#f4ad7a]"/></label>
        <label className="text-[10px] text-[#92958d]">Time<input required type="time" value={time} onChange={event => setTime(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-white/[.09] bg-[#191b1e] px-3 text-xs text-white outline-none focus:border-[#f4ad7a]"/></label>
        <label className="text-[10px] text-[#92958d]">Mode of payment<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-white/[.09] bg-[#191b1e] px-3 text-xs text-white outline-none focus:border-[#f4ad7a]">{["UPI", "Cash", "Card", "Bank transfer", "Other"].map(mode => <option key={mode}>{mode}</option>)}</select></label>
        <button disabled={busy} className="mt-auto flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#f28b55] px-4 text-xs font-semibold text-[#211915] hover:bg-[#ffa36d] disabled:opacity-50"><Plus size={14}/> Add</button>
      </form>
      {showTypeForm && <form onSubmit={saveType} className="mt-3 flex max-w-lg flex-wrap items-end gap-2 rounded-xl border border-white/[.08] bg-[#191b1e] p-3"><label className="min-w-[180px] flex-1 text-[10px] text-[#92958d]">New type name<input required autoFocus maxLength={40} value={newType} onChange={event => setNewType(event.target.value)} placeholder="e.g., Education" className="mt-1.5 h-9 w-full rounded-lg border border-white/[.09] bg-[#202326] px-3 text-xs text-white outline-none focus:border-[#f4ad7a]"/></label><button disabled={busy} className="h-9 rounded-lg bg-[#c4f67a] px-3 text-xs font-semibold text-[#20231a] disabled:opacity-50">{busy ? "Saving..." : "Save type"}</button><button type="button" onClick={() => setShowTypeForm(false)} aria-label="Cancel adding type" className="grid h-9 w-9 place-items-center rounded-lg text-[#a6a9a1] hover:bg-white/[.06]"><X size={14}/></button></form>}
      {message && <p role="status" className={`mt-3 text-xs ${message.includes("saved") || message.includes("added") ? "text-[#c4f67a]" : "text-[#ff9b9b]"}`}>{message}</p>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-white/[.08] bg-[#202326]"><div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4"><div><h3 className="flex items-center gap-2 text-sm font-semibold"><ReceiptText size={16} className="text-[#f4ad7a]"/> Purchases</h3><p className="mt-1 text-[10px] text-[#92958d]">{monthLabel}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-[#342d28] px-2.5 py-1 text-[10px] text-[#f4ad7a]"><CreditCard size={12}/>{expenses.length} entries</span></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#191b1e] text-[9px] uppercase tracking-wider text-[#858981]"><tr><th className="px-5 py-3">Amount</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Mode of payment</th><th className="px-4 py-3">Date</th><th className="px-4 py-3"></th></tr></thead><tbody>{expenses.length ? expenses.map(expense => <tr key={expense.id} className="border-t border-white/[.055] text-xs"><td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#f0efe9]">{money(Number(expense.amount_minor))}</td><td className="px-4 py-3.5 text-[#d2d4cc]">{expense.product}</td><td className="px-4 py-3.5 text-[#a6a9a1]">{expense.category || "Other"}</td><td className="whitespace-nowrap px-4 py-3.5 text-[#a6a9a1]">{expense.spent_at.slice(0, 5)}</td><td className="px-4 py-3.5 text-[#a6a9a1]">{expense.payment_method}</td><td className="whitespace-nowrap px-4 py-3.5 text-[#92958d]">{new Date(`${expense.occurred_on}T12:00:00`).toLocaleDateString("en", { day: "numeric", month: "short" })}</td><td className="px-4 py-3.5"><button onClick={() => void remove(expense)} aria-label={`Delete ${expense.product}`} className="rounded-lg p-1.5 text-[#858981] hover:bg-red-400/10 hover:text-red-300"><Trash2 size={14}/></button></td></tr>) : <tr><td colSpan={7} className="px-5 py-12 text-center text-xs text-[#92958d]"><ArrowDownRight size={18} className="mx-auto mb-2 text-[#c4f67a]"/>No expenses recorded this month. Add your first purchase above.</td></tr>}</tbody></table></div></section>
  </div>;
}
