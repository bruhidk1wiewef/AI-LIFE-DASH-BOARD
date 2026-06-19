import { NextResponse } from 'next/server';
import { createClient, getProfile, getUser } from '@/lib/supabase/server';
import { openai, AI_MODEL } from '@/lib/ai/client';
import { buildCoachingPrompt, type PlannerContext } from '@/lib/ai/prompts';

export const runtime = 'nodejs';

interface ChatBody {
  chatMessage?: string;
  chatHistory?: { role: 'user' | 'assistant'; content: string }[];
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile();
  if (profile?.plan !== 'pro') {
    return NextResponse.json({ error: 'upgrade_required', message: 'AI Coach is a Pro feature.' }, { status: 402 });
  }

  // Optional chat body — if present, this is a free-form follow-up question
  // rather than a fresh "generate insights" request.
  let chatBody: ChatBody = {};
  try {
    chatBody = await req.json();
  } catch {
    // No body sent — treat as standard insight generation request.
  }

  const supabase = createClient();

  if (chatBody.chatMessage) {
    return handleChatMessage(supabase, user.id, chatBody);
  }
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString();

  const [tasksRes, recentTasksRes, eventsRes, habitsRes, goalsRes] = await Promise.all([
    supabase.from('tasks').select('title, priority, due_date, due_time, completed').eq('user_id', user.id).limit(15),
    supabase
      .from('tasks')
      .select('completed')
      .eq('user_id', user.id)
      .gte('due_date', weekAgo)
      .lte('due_date', today),
    supabase
      .from('events')
      .select('title, start_time, end_time')
      .eq('user_id', user.id)
      .gte('start_time', `${today}T00:00:00`)
      .lt('start_time', tomorrow),
    supabase.from('habits').select('id, name, target_per_week').eq('user_id', user.id).eq('archived', false),
    supabase.from('goals').select('title, current_value, target_value, unit').eq('user_id', user.id).eq('status', 'active'),
  ]);

  const recent = recentTasksRes.data ?? [];
  const completionRate = recent.length > 0 ? Math.round((recent.filter((t) => t.completed).length / recent.length) * 100) : 0;

  const habitStreaks: Record<string, number> = {};
  if (habitsRes.data) {
    await Promise.all(
      habitsRes.data.map(async (h) => {
        const { data } = await supabase.rpc('get_habit_streak', { p_habit_id: h.id });
        habitStreaks[h.name] = data ?? 0;
      })
    );
  }

  const context: PlannerContext & { completionRate: number } = {
    tasks: tasksRes.data ?? [],
    events: eventsRes.data ?? [],
    habits: habitsRes.data ?? [],
    habitStreaks,
    goals: goalsRes.data ?? [],
    timezone: profile?.timezone ?? 'UTC',
    today,
    completionRate,
  };

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: buildCoachingPrompt(context) }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const insight = completion.choices[0]?.message?.content ?? '';

    await supabase.from('ai_plans').insert({
      user_id: user.id,
      plan_date: today,
      plan_type: 'coaching_insight',
      content: insight,
      input_snapshot: context as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ insight });
  } catch (err) {
    console.error('AI coaching failed', err);
    return NextResponse.json({ error: 'ai_error', message: 'Failed to generate insights.' }, { status: 500 });
  }
}

/**
 * Handles a free-form chat message in the AI Planner's chat widget.
 * Pulls a lightweight context snapshot so responses stay grounded in the
 * user's actual tasks/goals/habits without re-running the full coaching prompt.
 */
async function handleChatMessage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: { chatMessage?: string; chatHistory?: { role: 'user' | 'assistant'; content: string }[] }
) {
  const today = new Date().toISOString().split('T')[0];

  const [tasksRes, goalsRes, habitsRes] = await Promise.all([
    supabase.from('tasks').select('title, completed').eq('user_id', userId).limit(20),
    supabase.from('goals').select('title, current_value, target_value, unit').eq('user_id', userId).eq('status', 'active'),
    supabase.from('habits').select('name').eq('user_id', userId).eq('archived', false),
  ]);

  const tasks = tasksRes.data ?? [];
  const goals = goalsRes.data ?? [];
  const habits = habitsRes.data ?? [];

  const contextSummary = `User's current data — Tasks: ${tasks.length} total (${tasks.filter((t) => t.completed).length} completed). Goals: ${goals.map((g) => `${g.title} (${g.current_value}/${g.target_value} ${g.unit})`).join(', ') || 'none'}. Habits: ${habits.map((h) => h.name).join(', ') || 'none'}. Today's date: ${today}.`;

  const messages = [
    { role: 'system' as const, content: `You are an AI life-management assistant embedded in a productivity dashboard. ${contextSummary} Be concise, friendly, and actionable. Keep responses under 4 sentences unless the user asks for detail.` },
    ...(body.chatHistory ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: body.chatMessage ?? '' },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 350,
    });
    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    return NextResponse.json({ insight: reply });
  } catch (err) {
    console.error('AI chat failed', err);
    return NextResponse.json({ error: 'ai_error', message: 'Failed to respond.' }, { status: 500 });
  }
}
