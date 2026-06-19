import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  current_value: z.number().optional(),
  target_value: z.number().optional(),
  deadline: z.string().optional().nullable(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createClient();
  const updates = { ...parsed.data } as Record<string, unknown>;

  // Auto-complete when current_value reaches target_value
  if (parsed.data.current_value !== undefined) {
    const { data: goal } = await supabase.from('goals').select('target_value').eq('id', params.id).single();
    if (goal && parsed.data.current_value >= goal.target_value) {
      updates.status = 'completed';
    }
  }

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ goal: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { error } = await supabase.from('goals').delete().eq('id', params.id).eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
