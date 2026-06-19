# AI Life Dashboard

A production-ready SaaS application for personal productivity and life management — tasks, calendar, notes, habits, goals, and an AI planning assistant, all in one dashboard.

![Stack](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E) ![OpenAI](https://img.shields.io/badge/AI-OpenAI-412991)

## Features

- **Tasks** — priorities, due dates, tags, recurring tasks, Kanban + list views
- **Calendar** — monthly view, event creation, color coding (Google Calendar sync hook included, OAuth wiring required)
- **Notes** — Markdown editor, categories, full-text search, AI summarization
- **Habits** — streak tracking, 28-day heatmap, weekly consistency %
- **Goals** — long-term goals with milestones, auto-updating progress bars
- **AI Planner** (Pro) — generates an optimized daily schedule from your real tasks/calendar/habits/goals
- **AI Coach** (Pro) — productivity insights, burnout warnings, time-management tips, free-form chat
- **Analytics** — interactive charts for task completion, habit consistency, goal progress
- **Notifications** — task/habit/event reminders + goal milestone alerts (cron-driven)
- **Auth** — email/password + Google OAuth, forgot/reset password, via Supabase Auth
- **Subscriptions** — Stripe-powered Free/Pro plans with server-side plan gating
- **Dark/light mode**, glassmorphism UI, fully responsive

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + ShadCN UI (Radix primitives) |
| Database | Supabase (Postgres) with Row Level Security |
| Auth | Supabase Auth (email/password, Google OAuth) |
| AI | OpenAI API (`gpt-4o` by default) |
| Payments | Stripe Checkout + webhooks |
| Charts | Recharts |

## Project structure

```
app/
  api/                  # Route handlers (REST-style API used by client components)
    ai/                 # plan, coach (+chat), summarize-note
    tasks/ events/ notes/ habits/ goals/   # CRUD endpoints
    stripe/             # checkout + webhook
    cron/               # scheduled notification generator
  auth/callback/        # OAuth code exchange
  login/ signup/ forgot-password/ reset-password/
  dashboard/            # authenticated app shell + all module pages
components/
  ui/                   # ShadCN primitives (button, card, dialog, select, …)
  layout/                # Sidebar, notification bell, theme provider
lib/
  supabase/             # browser + server Supabase clients
  ai/                   # OpenAI client + prompt templates
  utils.ts
types/database.types.ts # Hand-authored types mirroring the SQL schema
supabase/migrations/0001_init.sql   # Full DB schema, RLS policies, triggers
middleware.ts           # Auth session refresh + route protection
```

## Setup

### 1. Clone & install

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run `supabase/migrations/0001_init.sql` — this creates all tables, RLS policies, and helper functions
3. Under **Authentication → Providers**, enable **Google** OAuth and add your client ID/secret
4. Under **Authentication → URL Configuration**, set your redirect URL to `https://your-domain.com/auth/callback` (and `http://localhost:3000/auth/callback` for local dev)
5. Copy your project URL, anon key, and service role key into `.env.local`

### 3. Set up OpenAI

Get an API key from [platform.openai.com](https://platform.openai.com) and add it to `.env.local`.

### 4. Set up Stripe (optional, for monetization)

1. Create a product + recurring price ($12/mo) in the Stripe dashboard
2. Add a webhook endpoint pointing to `https://your-domain.com/api/stripe/webhook`, subscribed to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copy the secret key, price ID, and webhook signing secret into `.env.local`

### 5. Environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

### 6. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

### 7. Scheduled notifications (optional)

The `/api/cron/generate-notifications` route generates task/habit reminders and goal milestone alerts. Trigger it on a schedule:

- **Vercel**: `vercel.json` already includes an hourly cron config — just set `CRON_SECRET` in your environment and Vercel will call it automatically after deploy.
- **Supabase**: alternatively, wrap the same logic in a Supabase Edge Function with `pg_cron`.

## Database schema overview

All tables use Row Level Security — every row is scoped to `auth.uid()`, so users can only ever read/write their own data even if the anon key is exposed client-side.

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` with plan, timezone, Stripe IDs |
| `tasks` | Tasks with priority, due date, recurrence, Kanban column |
| `events` | Calendar events (Google Calendar sync via `google_event_id`) |
| `notes` | Markdown notes with full-text search (`tsvector`) + AI summary cache |
| `habits` / `habit_logs` | Habits + per-day completion logs (drives streaks & heatmap) |
| `goals` / `milestones` | Long-term goals with sub-milestones |
| `ai_plans` | Audit log of generated AI plans/insights (also used for daily-plan caching) |
| `notifications` | In-app reminders and alerts |

See `supabase/migrations/0001_init.sql` for full DDL, indexes, and the `get_habit_streak()` helper function.

## Plan gating

Free vs. Pro is enforced **server-side** in the API routes (not just hidden in the UI):

- Free: 50 active tasks, 5 habits, 3 active goals, no AI features
- Pro: unlimited tasks/habits/goals, AI Planner, AI Coach, AI note summarization, advanced analytics

Gating logic lives at the top of each relevant route handler (e.g. `app/api/tasks/route.ts`, `app/api/ai/plan/route.ts`) — search for `plan_limit` and `upgrade_required` to find all gates.

## Deployment

Deploy to **Vercel** (recommended — zero-config for Next.js + cron support):

```bash
vercel
```

Set all environment variables from `.env.example` in the Vercel project dashboard, then update:
- Supabase Auth redirect URLs to your production domain
- Stripe webhook endpoint to your production domain

## Extending this MVP

- **Google Calendar sync**: the `events.google_event_id` column and unique index are already in place; add an OAuth flow for `https://www.googleapis.com/auth/calendar` scope and a sync job that upserts into `events`
- **Push notifications**: pair the `notifications` table with a service worker + Web Push, or swap in OneSignal/Resend for email digests
- **Drag-and-drop Kanban/Calendar**: `@dnd-kit/core` is already a dependency — wire it into `TasksPage`'s Kanban view and `CalendarPage`'s grid
- **Recurring events**: `events.recurrence` mirrors the task recurrence pattern but isn't expanded into instances yet — add RRULE expansion (e.g. via `rrule.js`) if you need true recurring calendar events

## License

MIT — build on this freely.
