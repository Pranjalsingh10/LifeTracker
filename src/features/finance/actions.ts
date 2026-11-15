"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])-01$/;
const paymentMethods = ["Cash", "UPI", "Card", "Bank transfer", "Other"];

async function signedInClient() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? { error: "Sign in to manage expenses." } : { supabase, user };
}

export async function saveMonthlyBudget(monthStart: string, amountMinor: number) {
  if (!monthPattern.test(monthStart) || !Number.isSafeInteger(amountMinor) || amountMinor < 0) return { ok: false as const, error: "Enter a valid monthly budget." };
  const session = await signedInClient();
  if ("error" in session) return { ok: false as const, error: session.error };
  const { error } = await session.supabase.from("monthly_budgets").upsert({
    user_id: session.user.id, month_start: monthStart, amount_minor: amountMinor, currency: "INR", updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,month_start" });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function addExpense(input: { product: string; amountMinor: number; date: string; time: string; paymentMethod: string }) {
  if (!input.product.trim() || input.product.trim().length > 120 || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) || !paymentMethods.includes(input.paymentMethod)) {
    return { ok: false as const, error: "Check the product, amount, date, time, and payment method." };
  }
  const session = await signedInClient();
  if ("error" in session) return { ok: false as const, error: session.error };
  const { data, error } = await session.supabase.from("transactions").insert({
    user_id: session.user.id,
    product: input.product.trim(), amount_minor: input.amountMinor,
    occurred_on: input.date, spent_at: input.time, payment_method: input.paymentMethod,
    currency: "INR", kind: "expense", category: "General", memo: null,
  }).select("id,product,amount_minor,currency,occurred_on,spent_at,payment_method,created_at").single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, expense: data };
}

export async function deleteExpense(expenseId: string) {
  if (!uuidPattern.test(expenseId)) return { ok: false as const, error: "Invalid expense." };
  const session = await signedInClient();
  if ("error" in session) return { ok: false as const, error: session.error };
  const { error } = await session.supabase.from("transactions").delete().eq("id", expenseId).eq("user_id", session.user.id);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
