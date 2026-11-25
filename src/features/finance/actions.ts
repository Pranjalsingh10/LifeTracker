"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])-01$/;
const paymentMethods = ["Cash", "UPI", "Card", "Bank transfer", "Other"];
const builtInExpenseTypes = ["Food", "Travel", "Shopping", "Bills", "Health", "Entertainment", "Transport", "Other"];

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

export async function addExpense(input: { product: string; amountMinor: number; date: string; time: string; paymentMethod: string; category: string }) {
  if (!input.product.trim() || input.product.trim().length > 120 || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) || !paymentMethods.includes(input.paymentMethod)
    || !input.category?.trim() || input.category.trim().length > 40) {
    return { ok: false as const, error: "Check the product, amount, date, time, and payment method." };
  }
  const session = await signedInClient();
  if ("error" in session) return { ok: false as const, error: session.error };
  const category = input.category.trim();
  if (!builtInExpenseTypes.some(type => type.toLowerCase() === category.toLowerCase())) {
    const { data: ownedTypes, error: typeError } = await session.supabase.from("expense_types")
      .select("name").eq("user_id", session.user.id);
    if (typeError || !ownedTypes?.some(type => type.name.toLowerCase() === category.toLowerCase())) {
      return { ok: false as const, error: "Choose one of your saved expense types." };
    }
  }
  const { data, error } = await session.supabase.from("transactions").insert({
    user_id: session.user.id,
    product: input.product.trim(), amount_minor: input.amountMinor,
    occurred_on: input.date, spent_at: input.time, payment_method: input.paymentMethod,
    currency: "INR", kind: "expense", category, memo: null,
  }).select("id,product,amount_minor,currency,occurred_on,spent_at,payment_method,category,created_at").single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, expense: data };
}

export async function createExpenseType(rawName: string) {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name || name.length > 40 || !/^[\p{L}\p{N}][\p{L}\p{N} &()_-]*$/u.test(name)) {
    return { ok: false as const, error: "Use 1 to 40 letters, numbers, spaces, or simple punctuation." };
  }
  if (builtInExpenseTypes.some(type => type.toLowerCase() === name.toLowerCase())) {
    return { ok: false as const, error: "That type is already in the list." };
  }
  const session = await signedInClient();
  if ("error" in session) return { ok: false as const, error: session.error };
  const { data: existingTypes, error: lookupError } = await session.supabase.from("expense_types")
    .select("id,name").eq("user_id", session.user.id);
  if (lookupError) return { ok: false as const, error: lookupError.message };
  if (existingTypes?.some(type => type.name.toLowerCase() === name.toLowerCase())) return { ok: false as const, error: "You already have this type." };
  const { data, error } = await session.supabase.from("expense_types")
    .insert({ user_id: session.user.id, name }).select("id,name").single();
  if (error) return { ok: false as const, error: error.code === "23505" ? "You already have this type." : error.message };
  return { ok: true as const, expenseType: data };
}

export async function deleteExpense(expenseId: string) {
  if (!uuidPattern.test(expenseId)) return { ok: false as const, error: "Invalid expense." };
  const session = await signedInClient();
  if ("error" in session) return { ok: false as const, error: session.error };
  const { error } = await session.supabase.from("transactions").delete().eq("id", expenseId).eq("user_id", session.user.id);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
