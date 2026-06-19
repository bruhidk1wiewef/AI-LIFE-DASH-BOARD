import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { z } from 'zod';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notifications: data, unreadCount: data.filter((n) => !n.read).length });
}

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = markReadSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

  const supabase = createClient();
  let query = supabase.from('notifications').update({ read: true }).eq('user_id', user.id);

  if (!parsed.data.markAll && parsed.data.ids) {
    query = query.in('id', parsed.data.ids);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
