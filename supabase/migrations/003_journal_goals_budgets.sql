-- Add journal, recurring goals, and monthly budget support.
-- Safe to run after schema.sql and migrations 002_auth_permissions.sql.

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

drop policy if exists "goal owner access" on public.goals;
create policy "goal owner access" on public.goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "goal habit owner access" on public.goal_habits;
create policy "goal habit owner access" on public.goal_habits for all to authenticated
  using (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
drop policy if exists "monthly budget owner access" on public.monthly_budgets;
create policy "monthly budget owner access" on public.monthly_budgets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.goals, public.goal_habits, public.monthly_budgets from anon;
grant select, insert, update, delete on public.goals, public.goal_habits, public.monthly_budgets to authenticated;
