-- Run in the Supabase SQL Editor. Supabase Auth owns the canonical user identity.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  emoji text not null default '✨',
  color text not null default '#8b5cf6',
  category text not null default 'Other',
  target_days smallint not null default 7 check (target_days between 1 and 7),
  notes text,
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index habits_user_position_idx on public.habits(user_id, position) where archived_at is null;

create table public.habit_logs (
  habit_id uuid not null references public.habits(id) on delete cascade,
  logged_on date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (habit_id, logged_on)
);
create index habit_logs_logged_on_idx on public.habit_logs(logged_on);

-- Future modules stay separate from habit domain tables.
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  title text,
  body text not null default '',
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, entry_date)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null default current_date,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'USD',
  kind text not null check (kind in ('income', 'expense')),
  category text not null,
  memo text,
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions(user_id, occurred_on desc);

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.diary_entries enable row level security;
alter table public.transactions enable row level security;

create policy "profile owner access" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "habit owner access" on public.habits for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "habit log owner access" on public.habit_logs for all to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "diary owner access" on public.diary_entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transaction owner access" on public.transactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.profiles, public.habits, public.habit_logs, public.diary_entries, public.transactions from anon;
grant select, insert, update, delete on public.profiles, public.habits, public.habit_logs, public.diary_entries, public.transactions to authenticated;

-- Create profile rows on signup. Security definer is constrained to this function's search path.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Current feature additions. Existing projects can run migrations 003 and 004 instead.
alter table public.transactions
  add column if not exists product text not null default '',
  add column if not exists spent_at time not null default localtime,
  add column if not exists payment_method text not null default 'Other';
alter table public.transactions alter column currency set default 'INR';

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  details text,
  period text not null check (period in ('weekly', 'monthly', 'yearly')),
  created_at timestamptz not null default now()
);
create index if not exists goals_user_period_idx on public.goals(user_id, period);
create table if not exists public.goal_habits (
  goal_id uuid not null references public.goals(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  primary key (goal_id, habit_id)
);
create index if not exists goal_habits_habit_idx on public.goal_habits(habit_id);
create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'INR',
  updated_at timestamptz not null default now(),
  unique (user_id, month_start)
);
create index if not exists monthly_budgets_user_month_idx on public.monthly_budgets(user_id, month_start desc);

alter table public.goals enable row level security;
alter table public.goal_habits enable row level security;
alter table public.monthly_budgets enable row level security;
create policy "goal owner access" on public.goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goal habit owner access" on public.goal_habits for all to authenticated
  using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
create policy "monthly budget owner access" on public.monthly_budgets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.goals, public.goal_habits, public.monthly_budgets from anon;
grant select, insert, update, delete on public.goals, public.goal_habits, public.monthly_budgets to authenticated;

create table if not exists public.expense_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);
create unique index if not exists expense_types_user_name_ci_idx on public.expense_types (user_id, lower(name));
alter table public.expense_types enable row level security;
create policy "expense type owner access" on public.expense_types for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.expense_types from anon;
grant select, insert, update, delete on public.expense_types to authenticated;
