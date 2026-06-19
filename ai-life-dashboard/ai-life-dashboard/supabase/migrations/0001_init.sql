-- ============================================================================
-- AI Life Dashboard — Initial Schema
-- Run via: supabase db push   (or paste into Supabase SQL Editor)
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- PROFILES
-- Mirrors auth.users, holds app-specific user data + plan info.
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  timezone text default 'UTC',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure moddatetime(updated_at);

-- Auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- TASKS
-- ============================================================================
create type task_priority as enum ('low', 'medium', 'high');
create type task_column as enum ('todo', 'in_progress', 'done');
create type recurrence_freq as enum ('none', 'daily', 'weekly', 'monthly');

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  priority task_priority not null default 'medium',
  column_status task_column not null default 'todo',
  due_date date,
  due_time time,
  completed boolean not null default false,
  completed_at timestamptz,
  tags text[] not null default '{}',
  recurrence recurrence_freq not null default 'none',
  recurrence_parent_id uuid references public.tasks(id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_id_idx on public.tasks(user_id);
create index tasks_due_date_idx on public.tasks(due_date);
create index tasks_column_idx on public.tasks(column_status);

create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute procedure moddatetime(updated_at);

-- ============================================================================
-- CALENDAR EVENTS
-- ============================================================================
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  location text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean not null default false,
  color text not null default '#7c6fff',
  google_event_id text,
  reminder_minutes_before integer default 10,
  recurrence recurrence_freq not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_user_id_idx on public.events(user_id);
create index events_start_time_idx on public.events(start_time);
create unique index events_google_event_id_idx on public.events(google_event_id) where google_event_id is not null;

create trigger set_events_updated_at
  before update on public.events
  for each row execute procedure moddatetime(updated_at);

-- ============================================================================
-- NOTES
-- ============================================================================
create table public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled',
  content text not null default '',
  content_format text not null default 'markdown' check (content_format in ('markdown', 'richtext')),
  category text not null default 'general',
  ai_summary text,
  ai_summary_generated_at timestamptz,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_idx on public.notes(user_id);
create index notes_category_idx on public.notes(category);
-- Full text search
alter table public.notes add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) stored;
create index notes_search_idx on public.notes using gin(search_vector);

create trigger set_notes_updated_at
  before update on public.notes
  for each row execute procedure moddatetime(updated_at);

-- ============================================================================
-- HABITS
-- ============================================================================
create table public.habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text not null default 'ti-heart',
  color text not null default '#7c6fff',
  target_per_week integer not null default 7 check (target_per_week between 1 and 7),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index habits_user_id_idx on public.habits(user_id);

create trigger set_habits_updated_at
  before update on public.habits
  for each row execute procedure moddatetime(updated_at);

-- Habit completions: one row per day completed (drives streaks + heatmap)
create table public.habit_logs (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_on date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, completed_on)
);

create index habit_logs_habit_id_idx on public.habit_logs(habit_id);
create index habit_logs_user_id_idx on public.habit_logs(user_id);
create index habit_logs_completed_on_idx on public.habit_logs(completed_on);

-- ============================================================================
-- GOALS + MILESTONES
-- ============================================================================
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'personal',
  target_value numeric not null default 100,
  current_value numeric not null default 0,
  unit text not null default '%',
  deadline date,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals(user_id);

create trigger set_goals_updated_at
  before update on public.goals
  for each row execute procedure moddatetime(updated_at);

create table public.milestones (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index milestones_goal_id_idx on public.milestones(goal_id);

-- ============================================================================
-- AI PLANS — generated daily schedules / coaching sessions (audit + caching)
-- ============================================================================
create table public.ai_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_date date not null default current_date,
  plan_type text not null default 'daily_schedule' check (plan_type in ('daily_schedule', 'weekly_review', 'coaching_insight')),
  content text not null,
  input_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index ai_plans_user_id_idx on public.ai_plans(user_id);
create index ai_plans_plan_date_idx on public.ai_plans(plan_date);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('task_reminder', 'habit_reminder', 'goal_milestone', 'ai_recommendation', 'event_reminder')),
  title text not null,
  body text,
  read boolean not null default false,
  related_id uuid,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_read_idx on public.notifications(read);

-- ============================================================================
-- moddatetime helper (Supabase ships this extension; create fallback if missing)
-- ============================================================================
create or replace function moddatetime()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.notes enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.ai_plans enable row level security;
alter table public.notifications enable row level security;

-- Profiles: users can read/update only their own row
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Generic per-user CRUD policy template applied to each table
create policy "tasks_all_own" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "events_all_own" on public.events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_all_own" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits_all_own" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_logs_all_own" on public.habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_all_own" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milestones_all_own" on public.milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_plans_all_own" on public.ai_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_all_own" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- Daily productivity score components, computed per user per day
create or replace view public.daily_stats as
select
  user_id,
  due_date as stat_date,
  count(*) as total_tasks,
  count(*) filter (where completed) as completed_tasks
from public.tasks
where due_date is not null
group by user_id, due_date;

-- Habit streak calculation (current streak as of today)
create or replace function public.get_habit_streak(p_habit_id uuid)
returns integer as $$
declare
  streak integer := 0;
  check_date date := current_date;
begin
  loop
    if exists (select 1 from public.habit_logs where habit_id = p_habit_id and completed_on = check_date) then
      streak := streak + 1;
      check_date := check_date - interval '1 day';
    else
      exit;
    end if;
  end loop;
  return streak;
end;
$$ language plpgsql stable;
