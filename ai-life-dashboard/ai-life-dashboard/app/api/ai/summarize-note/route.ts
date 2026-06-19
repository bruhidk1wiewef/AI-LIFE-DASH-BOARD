import { NextResponse } from 'next/server';
import { createClient, getProfile, getUser } from '@/lib/supabase/server';
import { openai, AI_MODEL } from '@/lib/ai/client';
import { buildNoteSummaryPrompt } from '@/lib/ai/prompts';
import { z } from 'zod';

export const runtime = 'nodejs';

const bodySchema = z.object({
  noteId: z.string().uuid(),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getProfile();
  if (profile?.plan !== 'pro') {
    return NextResponse.json({ error: 'upgrade_required', message: 'AI note summarization is a Pro feature.' }, { status: 402 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: note, error } = await supabase
    .from('notes')
    .select('id, title, content')
    .eq('id', parsed.data.noteId)
    .eq('user_id', user.id)
    .single();

  if (error || !note) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (!note.content || note.content.trim().length < 20) {
    return NextResponse.json({ error: 'too_short', message: 'Note is too short to summarize.' }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: buildNoteSummaryPrompt(note.title, note.content) }],
      temperature: 0.4,
      max_tokens: 300,
    });

    const summary = completion.choices[0]?.message?.content ?? '';

    await supabase
      .from('notes')
      .update({ ai_summary: summary, ai_summary_generated_at: new Date().toISOString() })
      .eq('id', note.id);

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('Note summarization failed', err);
    return NextResponse.json({ error: 'ai_error', message: 'Failed to summarize note.' }, { status: 500 });
  }
}
