import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().default('ti-heart'),
  color: z.string().default('#7c6fff'),
  target_per_week: z.number().min(1).max(7).default(7),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('archived', false)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const since = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];
  const habitsWithLogs = await Promise.all(
    (habits ?? []).map(async (h) => {
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('completed_on')
        .eq('habit_id', h.id)
        .gte('completed_on', since);
      const { data: streak } = await supabase.rpc('get_habit_streak', { p_habit_id: h.id });
      return { ...h, completedDays: (logs ?? []).map((l) => l.completed_on), streak: streak ?? 0 };
    })
  );

  return NextResponse.json({ habits: habitsWithLogs });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createClient();

  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
  if (profile?.plan !== 'pro') {
    const { count } = await supabase
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('archived', false);
    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'plan_limit', message: 'Free plan is limited to 5 habits. Upgrade to Pro for unlimited habits.' },
        { status: 402 }
      );
    }
  }

  const { data, error } = await supabase
    .from('habits')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ habit: data }, { status: 201 });
}
