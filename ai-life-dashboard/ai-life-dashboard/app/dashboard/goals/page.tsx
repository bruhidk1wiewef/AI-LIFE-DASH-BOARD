'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Target, Trash2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calcPercent, formatDate } from '@/lib/utils';
import type { Goal, Milestone } from '@/types/database.types';

type GoalWithMilestones = Goal & { milestones: Milestone[] };

const CATEGORIES = ['startup', 'health', 'learning', 'personal', 'finance', 'career'];
const CAT_COLORS: Record<string, string> = {
  startup: '#7c6fff', health: '#34d399', learning: '#60a5fa',
  personal: '#fb923c', finance: '#f472b6', career: '#a78bfa',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '', description: '', category: 'personal',
    target_value: 100, current_value: 0, unit: '%',
    deadline: '', milestones: '',
  });

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/goals');
    const data = await res.json();
    setGoals(data.goals ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  async function addGoal() {
    if (!newGoal.title.trim()) return;
    setSaving(true);
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newGoal,
        target_value: Number(newGoal.target_value),
        current_value: Number(newGoal.current_value),
        deadline: newGoal.deadline || null,
        milestones: newGoal.milestones.split('\n').map((m) => m.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.message ?? data.error); return; }
    await fetchGoals();
    setShowAdd(false);
    setNewGoal({ title: '', description: '', category: 'personal', target_value: 100, current_value: 0, unit: '%', deadline: '', milestones: '' });
    toast.success('Goal added!');
  }

  async function updateProgress(id: string, value: number) {
    const res = await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_value: value }),
    });
    const data = await res.json();
    if (res.ok) setGoals((prev) => prev.map((g) => g.id === id ? { ...g, ...data.goal } : g));
  }

  async function deleteGoal(id: string) {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    setGoals((prev) => prev.filter((g) => g.id !== id));
    toast.success('Goal deleted.');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-sm text-muted-foreground">
            {goals.filter((g) => g.status === 'active').length} active ·{' '}
            {goals.filter((g) => g.status === 'completed').length} completed
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> New goal</Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading goals…</div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <Target className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">No goals yet. Set your first one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const pct = calcPercent(goal.current_value, goal.target_value);
            const color = CAT_COLORS[goal.category] ?? '#7c6fff';
            const isExpanded = expanded === goal.id;

            return (
              <Card key={goal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: color + '22' }}>
                      <Target className="h-5 w-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{goal.title}</h3>
                        <Badge variant="outline" className="text-[10px] capitalize" style={{ color, borderColor: color + '60' }}>
                          {goal.category}
                        </Badge>
                        {goal.status === 'completed' && (
                          <Badge className="text-[10px] bg-success/15 text-success">✓ Completed</Badge>
                        )}
                      </div>
                      {goal.description && <p className="mt-0.5 text-xs text-muted-foreground">{goal.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setExpanded(isExpanded ? null : goal.id)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteGoal(goal.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-1.5">
                    <Progress value={pct} className="flex-1" indicatorClassName="" style={{ '--tw-bg-opacity': 1 } as React.CSSProperties} />
                    <span className="text-sm font-bold shrink-0" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{goal.current_value}/{goal.target_value} {goal.unit}</span>
                    {goal.deadline && <span>Due {formatDate(goal.deadline)}</span>}
                  </div>

                  {/* Update progress inline */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Update progress:</span>
                    <Input
                      type="number"
                      className="h-7 w-24 text-xs"
                      min={0}
                      max={goal.target_value}
                      defaultValue={goal.current_value}
                      onBlur={(e) => updateProgress(goal.id, Number(e.target.value))}
                    />
                    <span className="text-xs text-muted-foreground">{goal.unit}</span>
                  </div>

                  {/* Milestones (expandable) */}
                  {isExpanded && goal.milestones.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Milestones</p>
                      <div className="space-y-2">
                        {goal.milestones.map((m) => (
                          <div key={m.id} className="flex items-center gap-2">
                            <CheckCircle2 className={`h-4 w-4 shrink-0 ${m.completed ? 'text-success' : 'text-muted-foreground/40'}`} />
                            <span className={`text-sm ${m.completed ? 'line-through text-muted-foreground' : ''}`}>{m.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New goal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Goal title</Label>
              <Input placeholder="What do you want to achieve?" value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input placeholder="Brief description" value={newGoal.description} onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newGoal.category} onValueChange={(v) => setNewGoal({ ...newGoal, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input placeholder="%, kg, books…" value={newGoal.unit} onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Target</Label>
                <Input type="number" value={newGoal.target_value} onChange={(e) => setNewGoal({ ...newGoal, target_value: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Deadline (optional)</Label>
                <Input type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Milestones (one per line, optional)</Label>
              <Textarea
                placeholder={"Week 4 check-in\nMonth 2 review\nFinal stretch"}
                rows={3}
                value={newGoal.milestones}
                onChange={(e) => setNewGoal({ ...newGoal, milestones: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addGoal} disabled={saving || !newGoal.title.trim()}>
              {saving ? 'Adding…' : <><Plus className="h-4 w-4" /> Add goal</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
