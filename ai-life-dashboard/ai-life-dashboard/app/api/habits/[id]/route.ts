import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { z } from 'zod';

const toggleSchema = z.object({
  date: z.string(), // YYYY-MM-DD
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = toggleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const supabase = createClient();

  // Verify habit ownership
  const { data: habit } = await supabase.from('habits').select('id').eq('id', params.id).eq('user_id', user.id).single();
  if (!habit) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: existing } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', params.id)
    .eq('completed_on', parsed.data.date)
    .maybeSingle();

  if (existing) {
    await supabase.from('habit_logs').delete().eq('id', existing.id);
    return NextResponse.json({ completed: false });
  } else {
    await supabase.from('habit_logs').insert({ habit_id: params.id, user_id: user.id, completed_on: parsed.data.date });
    return NextResponse.json({ completed: true });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { error } = await supabase.from('habits').update({ archived: true }).eq('id', params.id).eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
