-- Save custom expense types for each signed-in user.
create table if not exists public.expense_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

create unique index if not exists expense_types_user_name_ci_idx
  on public.expense_types (user_id, lower(name));

alter table public.expense_types enable row level security;
drop policy if exists "expense type owner access" on public.expense_types;
create policy "expense type owner access" on public.expense_types for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.expense_types from anon;
grant select, insert, update, delete on public.expense_types to authenticated;
