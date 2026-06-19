import { NextResponse } from 'next/server';
import { createClient, getProfile, getUser } from '@/lib/supabase/server';
import { openai, AI_MODEL } from '@/lib/ai/client';
import { buildDailyPlanPrompt, type PlannerContext } from '@/lib/ai/prompts';

export const runtime = 'nodejs';

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await getProfile();
  if (profile?.plan !== 'pro') {
    return NextResponse.json({ error: 'upgrade_required', message: 'AI Planner is a Pro feature.' }, { status: 402 });
  }

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString();

  const [tasksRes, eventsRes, habitsRes, goalsRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('title, priority, due_date, due_time, completed')
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('priority', { ascending: false })
      .limit(15),
    supabase
      .from('events')
      .select('title, start_time, end_time')
      .eq('user_id', user.id)
      .gte('start_time', `${today}T00:00:00`)
      .lt('start_time', tomorrow)
      .order('start_time'),
    supabase.from('habits').select('id, name, target_per_week').eq('user_id', user.id).eq('archived', false),
    supabase
      .from('goals')
      .select('title, current_value, target_value, unit')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(10),
  ]);

  const habitStreaks: Record<string, number> = {};
  if (habitsRes.data) {
    await Promise.all(
      habitsRes.data.map(async (h) => {
        const { data } = await supabase.rpc('get_habit_streak', { p_habit_id: h.id });
        habitStreaks[h.name] = data ?? 0;
      })
    );
  }

  const context: PlannerContext = {
    tasks: tasksRes.data ?? [],
    events: eventsRes.data ?? [],
    habits: habitsRes.data ?? [],
    habitStreaks,
    goals: goalsRes.data ?? [],
    timezone: profile?.timezone ?? 'UTC',
    today,
  };

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: buildDailyPlanPrompt(context) }],
      temperature: 0.6,
      max_tokens: 800,
    });

    const planText = completion.choices[0]?.message?.content ?? '';

    await supabase.from('ai_plans').insert({
      user_id: user.id,
      plan_date: today,
      plan_type: 'daily_schedule',
      content: planText,
      input_snapshot: context as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ plan: planText });
  } catch (err) {
    console.error('AI plan generation failed', err);
    return NextResponse.json({ error: 'ai_error', message: 'Failed to generate plan. Please try again.' }, { status: 500 });
  }
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('ai_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('plan_date', today)
    .eq('plan_type', 'daily_schedule')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ plan: data?.content ?? null });
}
