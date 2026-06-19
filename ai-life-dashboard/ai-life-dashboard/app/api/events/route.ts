import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
  all_day: z.boolean().default(false),
  color: z.string().default('#7c6fff'),
  reminder_minutes_before: z.number().default(10),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
});

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const supabase = createClient();
  let query = supabase.from('events').select('*').eq('user_id', user.id).order('start_time');

  if (from) query = query.gte('start_time', from);
  if (to) query = query.lte('start_time', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', details: parsed.error.flatten() }, { status: 400 });
  }

  if (new Date(parsed.data.end_time) <= new Date(parsed.data.start_time)) {
    return NextResponse.json({ error: 'invalid_request', message: 'end_time must be after start_time' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ event: data }, { status: 201 });
}
