# Life Tracker

A Next.js App Router app for habit tracking, daily journaling, goal planning, and expense tracking. It uses Supabase Postgres and Supabase Auth. Each area has a separate feature module.

## Free stack setup

Use Node.js 20.9+ and npm. Current Next.js defaults include TypeScript, Tailwind CSS, ESLint, and the App Router.

```powershell
npx create-next-app@latest habit-harbor --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd habit-harbor
npm install @supabase/supabase-js @supabase/ssr lucide-react
npx shadcn@latest init
npx shadcn@latest add button dialog input label select textarea switch
```

Copy this starter's `src/` and `supabase/` into the generated project (or use its files as a reference). Configure `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Create a free Supabase project, open **SQL Editor**, and run `supabase/schema.sql`. If the existing project already has the habit tables, run migrations `002_auth_permissions.sql` and `003_journal_goals_budgets.sql` as needed. In Supabase Auth, enable email/password; set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the redirect URL allow list (and your deployed callback URL later). The app loads data for the signed-in user, batches habit checkbox changes before saving, and saves journal entries, goals, expenses, and budgets with authenticated server actions. Do not expose the service-role key in the browser. Deploy by pushing the project to GitHub, importing it into Vercel Hobby, and setting the same environment variables in Vercel.

Supabase Auth is used instead of NextAuth so the same identity/session system works directly with Postgres row level security. Prisma is intentionally omitted: direct Supabase queries keep RLS enforcement in the database and avoid maintaining a second schema/migration path. Supabase currently lists 500 MB database storage in Free and notes inactive free projects may pause; Vercel Hobby is a free tier aimed at personal projects and has usage caps. Check current limits before depending on it for a production business.

## Project structure

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
    ui/                  # shadcn primitives shared across features
  lib/
    supabase/            # server/client Supabase factories
  features/
    habits/              # habit grid, calendar, insights, actions
    journal/             # daily notebook and save action
    goals/               # recurring goals linked to habits
    finance/             # expenses and monthly budget
supabase/
  schema.sql
```

## Schema and isolation

`supabase/schema.sql` links records to `auth.users`, keeps habit definitions separate from daily logs, and includes diary, goals, transactions, and monthly budgets. Every user-owned table has RLS policies based on `auth.uid()`. Habit logs use `(habit_id, logged_on)` as their key, so an upsert can safely represent either state. Money uses integer minor units (paise) to avoid floating point errors. Existing databases can add the new feature tables with migration `003_journal_goals_budgets.sql`.

## Efficient grid updates

The UI updates local state immediately and saves changed date/habit pairs in a single upsert after a 700 ms pause. It preserves failed changes for retry, and the header shows save status. The server action gets the user from the Supabase session; RLS is the final ownership check.

## UI

The dashboard in `src/features/habits/components/habit-dashboard.tsx` is an interactive dark-mode habit planner with Supabase-backed edits and completion history. `src/features/habits/components/habit-views.tsx` contains the table-only Habits view and weekly/monthly insight charts. Habit archive is soft-delete: logs remain in the database for reporting or later restore support.
