'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Flame, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface HabitWithLogs {
  id: string;
  name: string;
  icon: string;
  color: string;
  target_per_week: number;
  completedDays: string[];
  streak: number;
}

const ICONS = ['ti-run', 'ti-book', 'ti-brain', 'ti-code', 'ti-heart', 'ti-pencil', 'ti-droplet', 'ti-sun'];
const COLORS = [
  { label: 'Purple', value: '#7c6fff' },
  { label: 'Green', value: '#34d399' },
  { label: 'Blue', value: '#60a5fa' },
  { label: 'Orange', value: '#fb923c' },
  { label: 'Pink', value: '#f472b6' },
];

function getLast28Days() {
  const days: string[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [newHabit, setNewHabit] = useState({ name: '', icon: 'ti-heart', color: '#7c6fff', target_per_week: 7 });
  const today = new Date().toISOString().split('T')[0];
  const last28 = getLast28Days();

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/habits');
    const data = await res.json();
    setHabits(data.habits ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  async function addHabit() {
    if (!newHabit.name.trim()) return;
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newHabit),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.message ?? data.error); return; }
    await fetchHabits();
    setShowAdd(false);
    setNewHabit({ name: '', icon: 'ti-heart', color: '#7c6fff', target_per_week: 7 });
    toast.success('Habit added!');
  }

  async function toggleDay(id: string, date: string) {
    setToggling(id + date);
    const res = await fetch(`/api/habits/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    const data = await res.json();
    setToggling(null);
    if (!res.ok) { toast.error('Failed to update habit.'); return; }
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const days = data.completed
          ? [...h.completedDays, date]
          : h.completedDays.filter((d) => d !== date);
        const streak = data.completed ? h.streak + 1 : Math.max(0, h.streak - 1);
        return { ...h, completedDays: days, streak };
      })
    );
  }

  async function deleteHabit(id: string) {
    await fetch(`/api/habits/${id}`, { method: 'DELETE' });
    setHabits((prev) => prev.filter((h) => h.id !== id));
    toast.success('Habit archived.');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Habit Tracker</h1>
          <p className="text-sm text-muted-foreground">{habits.length} active habits</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> New habit</Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading habits…</div>
      ) : habits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <Flame className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">No habits yet. Build your first streak!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map((h) => {
            const completedLast28 = h.completedDays.filter((d) => last28.includes(d)).length;
            const pct = Math.round((completedLast28 / 28) * 100);
            const doneToday = h.completedDays.includes(today);

            return (
              <Card key={h.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: h.color + '22' }}>
                      <Flame className="h-5 w-5" style={{ color: h.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm">{h.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Target: {h.target_per_week}×/week · <span className="text-warning font-medium">🔥 {h.streak} day streak</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={doneToday ? 'default' : 'outline'}
                        className={cn('h-8 text-xs', doneToday ? 'bg-success/20 text-success border-success/40 hover:bg-success/30' : '')}
                        onClick={() => toggleDay(h.id, today)}
                        disabled={toggling === h.id + today}
                      >
                        {doneToday ? '✓ Done today' : 'Mark done'}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteHabit(h.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* 28-day heatmap */}
                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Last 28 days</span>
                      <span className="text-xs font-medium" style={{ color: h.color }}>{pct}% consistency</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {last28.map((day) => {
                        const done = h.completedDays.includes(day);
                        const isToday = day === today;
                        return (
                          <button
                            key={day}
                            title={day}
                            onClick={() => toggleDay(h.id, day)}
                            disabled={toggling === h.id + day}
                            className={cn(
                              'h-3.5 w-3.5 rounded-sm transition-all hover:scale-125',
                              isToday ? 'ring-1 ring-foreground/30' : ''
                            )}
                            style={{
                              background: done ? h.color : 'rgba(255,255,255,0.06)',
                              opacity: done ? 1 : 0.5,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <Progress value={pct} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>New habit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Habit name</Label>
              <Input placeholder="Exercise, Read, Meditate…" value={newHabit.name} onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Select value={newHabit.color} onValueChange={(v) => setNewHabit({ ...newHabit, color: v })}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: newHabit.color }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ background: c.value }} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Weekly target (days)</Label>
                <Input type="number" min={1} max={7} value={newHabit.target_per_week} onChange={(e) => setNewHabit({ ...newHabit, target_per_week: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addHabit} disabled={!newHabit.name.trim()}><Plus className="h-4 w-4" /> Add habit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
