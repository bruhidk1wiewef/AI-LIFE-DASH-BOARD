'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Sparkles, Eye, Edit3, Pin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Note } from '@/types/database.types';

const CATEGORIES = ['general', 'work', 'learning', 'personal', 'ideas'];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', category: 'general', content: '' });
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    const res = await fetch(`/api/notes?${params}`);
    const data = await res.json();
    setNotes(data.notes ?? []);
    if (!selected && data.notes?.length > 0) setSelected(data.notes[0].id);
    setLoading(false);
  }, [search, selected]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const selectedNote = notes.find((n) => n.id === selected);

  async function createNote() {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    setNotes((prev) => [data.note, ...prev]);
    setSelected(data.note.id);
    setEditing(true);
    setShowAdd(false);
    setNewNote({ title: '', category: 'general', content: '' });
    toast.success('Note created!');
  }

  async function deleteNote(id: string) {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelected(notes.find((n) => n.id !== id)?.id ?? null);
    toast.success('Note deleted.');
  }

  async function updateNote(id: string, patch: Partial<Note>) {
    await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  function handleContentChange(value: string) {
    setNotes((prev) => prev.map((n) => (n.id === selected ? { ...n, content: value } : n)));
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (selected) updateNote(selected, { content: value });
    }, 800);
  }

  async function summarizeNote() {
    if (!selected) return;
    setSummarizing(true);
    const res = await fetch('/api/ai/summarize-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId: selected }),
    });
    const data = await res.json();
    setSummarizing(false);
    if (!res.ok) {
      if (data.error === 'upgrade_required') toast.error('AI note summarization is a Pro feature.');
      else toast.error(data.message ?? data.error);
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === selected ? { ...n, ai_summary: data.summary } : n)));
    toast.success('Summary generated!');
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Sidebar */}
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 text-xs"
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="icon" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-muted-foreground px-2">Loading…</p>
          ) : notes.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 pt-4 text-center">No notes yet</p>
          ) : (
            notes.map((n) => (
              <button
                key={n.id}
                onClick={() => { setSelected(n.id); setEditing(false); }}
                className={cn(
                  'w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/10',
                  selected === n.id ? 'bg-primary/10 border border-primary/20' : 'border border-transparent'
                )}
              >
                <p className="truncate text-sm font-medium">{n.title || 'Untitled'}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{n.category} · {n.updated_at?.slice(0, 10)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor / viewer */}
      {selectedNote ? (
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          {/* Toolbar */}
          <div className="glass-card flex items-center justify-between px-4 py-2.5">
            <div>
              <h2 className="font-semibold">{selectedNote.title}</h2>
              <span className="text-xs text-muted-foreground capitalize">{selectedNote.category}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={summarizeNote} disabled={summarizing}>
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {summarizing ? 'Summarizing…' : 'AI Summary'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => updateNote(selectedNote.id, { pinned: !selectedNote.pinned })}>
                <Pin className={cn('h-3.5 w-3.5', selectedNote.pinned ? 'fill-current text-warning' : '')} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                {editing ? <Eye className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                {editing ? 'Preview' : 'Edit'}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteNote(selectedNote.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* AI Summary */}
          {selectedNote.ai_summary && (
            <div className="glass-card border-primary/20 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">✨ AI Summary</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedNote.ai_summary}</p>
            </div>
          )}

          {/* Content */}
          {editing ? (
            <Textarea
              className="flex-1 resize-none font-mono text-sm leading-relaxed"
              value={selectedNote.content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing in Markdown…"
            />
          ) : (
            <div className="glass-card flex-1 overflow-y-auto p-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{selectedNote.content || <span className="text-muted-foreground italic">No content yet. Click Edit to start writing.</span>}</pre>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Edit3 className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">Select a note or create one</p>
          </div>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>New note</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="Note title" value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={newNote.category} onValueChange={(v) => setNewNote({ ...newNote, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Initial content (optional)</Label>
              <Textarea placeholder="Start writing…" rows={3} value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={createNote} disabled={!newNote.title.trim()}><Plus className="h-4 w-4" /> Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
