import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().optional().nullable(),
  due_time: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
});

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const column = searchParams.get('column');
  const priority = searchParams.get('priority');

  const supabase = createClient();
  let query = supabase.from('tasks').select('*').eq('user_id', user.id).order('position');

  if (column) query = query.eq('column_status', column);
  if (priority) query = query.eq('priority', priority);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: data });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createClient();

  // Free plan limit: 50 active tasks
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
  if (profile?.plan !== 'pro') {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', false);
    if ((count ?? 0) >= 50) {
      return NextResponse.json(
        { error: 'plan_limit', message: 'Free plan is limited to 50 active tasks. Upgrade to Pro for unlimited tasks.' },
        { status: 402 }
      );
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ task: data }, { status: 201 });
}
