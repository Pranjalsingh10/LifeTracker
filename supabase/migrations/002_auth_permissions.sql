-- Apply this only if you already ran the earlier schema.sql version.
-- The policies remain owner-scoped and are restricted to signed-in accounts.
alter policy "profile owner access" on public.profiles to authenticated;
alter policy "habit owner access" on public.habits to authenticated;
alter policy "habit log owner access" on public.habit_logs to authenticated;
alter policy "diary owner access" on public.diary_entries to authenticated;
alter policy "transaction owner access" on public.transactions to authenticated;

revoke all on public.profiles, public.habits, public.habit_logs, public.diary_entries, public.transactions from anon;
grant select, insert, update, delete on public.profiles, public.habits, public.habit_logs, public.diary_entries, public.transactions to authenticated;
