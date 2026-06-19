import { NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(200).default('Untitled'),
  content: z.string().default(''),
  category: z.string().default('general'),
  content_format: z.enum(['markdown', 'richtext']).default('markdown'),
});

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q');
  const category = searchParams.get('category');

  const supabase = createClient();
  let query = supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (search) query = query.textSearch('search_vector', search);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notes: data });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request', details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('notes')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ note: data }, { status: 201 });
}
