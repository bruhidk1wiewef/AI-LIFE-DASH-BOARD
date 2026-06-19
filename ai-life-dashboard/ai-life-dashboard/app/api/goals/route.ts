import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().default('personal'),
  target_value: z.number().default(100),
  current_value: z.number().default(0),
  unit: z.string().default('%'),
  deadline: z.string().optional().nullable(),
  milestones: z.array(z.string()).optional().default([]),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data: goals, error } = await supabase
    .from('goals')
    .select('*, milestones(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ goals });
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
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'plan_limit', message: 'Free plan is limited to 3 active goals. Upgrade to Pro for unlimited goals.' },
        { status: 402 }
      );
    }
  }

  const { milestones, ...goalData } = parsed.data;

  const { data: goal, error } = await supabase
    .from('goals')
    .insert({ ...goalData, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (milestones.length > 0) {
    await supabase.from('milestones').insert(
      milestones.map((title, i) => ({ goal_id: goal.id, user_id: user.id, title, position: i }))
    );
  }

  return NextResponse.json({ goal }, { status: 201 });
}
