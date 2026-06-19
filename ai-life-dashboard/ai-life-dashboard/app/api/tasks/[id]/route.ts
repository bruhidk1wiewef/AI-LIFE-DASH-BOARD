import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  column_status: z.enum(['todo', 'in_progress', 'done']).optional(),
  due_date: z.string().optional().nullable(),
  due_time: z.string().optional().nullable(),
  completed: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  position: z.number().optional(),
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

  if (parsed.data.completed === true) {
    updates.completed_at = new Date().toISOString();
    updates.column_status = 'done';
  } else if (parsed.data.completed === false) {
    updates.completed_at = null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Handle recurring task: when marked complete, spawn the next occurrence
  if (parsed.data.completed === true && data?.recurrence && data.recurrence !== 'none') {
    const nextDate = new Date(data.due_date ?? Date.now());
    if (data.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    if (data.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    if (data.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

    await supabase.from('tasks').insert({
      user_id: user.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      due_date: nextDate.toISOString().split('T')[0],
      due_time: data.due_time,
      tags: data.tags,
      recurrence: data.recurrence,
      recurrence_parent_id: data.recurrence_parent_id ?? data.id,
      column_status: 'todo',
      completed: false,
    });
  }

  return NextResponse.json({ task: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { error } = await supabase.from('tasks').delete().eq('id', params.id).eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
