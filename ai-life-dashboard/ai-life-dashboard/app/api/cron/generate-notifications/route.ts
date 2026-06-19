import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// This route is designed to be invoked by a scheduler (Vercel Cron, Supabase
// Edge Function cron, or any external scheduler) — NOT by end users directly.
// Protect it with a shared secret header so it can't be triggered publicly.

export const runtime = 'nodejs';

const supabaseAdmin = createServiceClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  let createdCount = 0;

  // 1) Task reminders: tasks due today, not completed, not yet reminded
  const { data: dueTasks } = await supabaseAdmin
    .from('tasks')
    .select('id, user_id, title, due_time')
    .eq('due_date', today)
    .eq('completed', false);

  for (const task of dueTasks ?? []) {
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('related_id', task.id)
      .eq('type', 'task_reminder')
      .gte('created_at', `${today}T00:00:00`)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('notifications').insert({
        user_id: task.user_id,
        type: 'task_reminder',
        title: 'Task due today',
        body: task.title,
        related_id: task.id,
      });
      createdCount++;
    }
  }

  // 2) Habit reminders: habits not yet logged today, sent once per day per habit
  const { data: habits } = await supabaseAdmin.from('habits').select('id, user_id, name').eq('archived', false);
  for (const habit of habits ?? []) {
    const { data: loggedToday } = await supabaseAdmin
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habit.id)
      .eq('completed_on', today)
      .maybeSingle();

    if (!loggedToday) {
      const { data: existing } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('related_id', habit.id)
        .eq('type', 'habit_reminder')
        .gte('created_at', `${today}T00:00:00`)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from('notifications').insert({
          user_id: habit.user_id,
          type: 'habit_reminder',
          title: 'Habit not logged yet',
          body: `Don't forget to log "${habit.name}" today.`,
          related_id: habit.id,
        });
        createdCount++;
      }
    }
  }

  // 3) Goal milestone alerts: goals that just crossed 50%, 75%, or 100%
  const { data: goals } = await supabaseAdmin
    .from('goals')
    .select('id, user_id, title, current_value, target_value')
    .eq('status', 'active');

  for (const goal of goals ?? []) {
    const pct = Math.round((goal.current_value / goal.target_value) * 100);
    const milestoneCrossed = [50, 75, 100].find((m) => pct >= m);
    if (milestoneCrossed) {
      const { data: existing } = await supabaseAdmin
        .from('notifications')
        .select('id, body')
        .eq('related_id', goal.id)
        .eq('type', 'goal_milestone')
        .ilike('body', `%${milestoneCrossed}%`)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from('notifications').insert({
          user_id: goal.user_id,
          type: 'goal_milestone',
          title: `🎯 ${milestoneCrossed}% milestone reached!`,
          body: `You're ${milestoneCrossed}% of the way to "${goal.title}". Keep going!`,
          related_id: goal.id,
        });
        createdCount++;
      }
    }
  }

  // 4) Event reminders: events starting within the next hour
  const { data: upcomingEvents } = await supabaseAdmin
    .from('events')
    .select('id, user_id, title, start_time')
    .gte('start_time', now)
    .lte('start_time', inOneHour);

  for (const event of upcomingEvents ?? []) {
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('related_id', event.id)
      .eq('type', 'event_reminder')
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('notifications').insert({
        user_id: event.user_id,
        type: 'event_reminder',
        title: 'Upcoming event',
        body: `"${event.title}" starts soon.`,
        related_id: event.id,
      });
      createdCount++;
    }
  }

  return NextResponse.json({ success: true, notificationsCreated: createdCount });
}
