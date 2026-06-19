'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, List, Kanban, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Task } from '@/types/database.types';

const COLUMNS: { key: Task['column_status']; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: 'text-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', color: 'text-warning' },
  { key: 'done', label: 'Done', color: 'text-success' },
];

const PRIORITIES: Task['priority'][] = ['high', 'medium', 'low'];

type NewTask = {
  title: string;
  priority: Task['priority'];
  due_date: string;
  tags: string;
  recurrence: Task['recurrence'];
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [filter, setFilter] = useState<'all' | Task['priority']>('all');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState<NewTask>({
    title: '', priority: 'medium', due_date: '', tags: '', recurrence: 'none',
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function addTask() {
    if (!newTask.title.trim()) return;
    setSaving(true);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTask,
        tags: newTask.tags.split(',').map((t) => t.trim()).filter(Boolean),
        due_date: newTask.due_date || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.message ?? data.error);
      return;
    }
    setTasks((prev) => [data.task, ...prev]);
    setShowAdd(false);
    setNewTask({ title: '', priority: 'medium', due_date: '', tags: '', recurrence: 'none' });
    toast.success('Task added!');
  }

  async function toggleTask(id: string, completed: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    const data = await res.json();
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
    }
  }

  async function moveTask(id: string, column: Task['column_status']) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_status: column, completed: column === 'done' }),
    });
    const data = await res.json();
    if (res.ok) setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success('Task deleted.');
  }

  const filtered = tasks.filter((t) => filter === 'all' || t.priority === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.filter((t) => !t.completed).length} remaining</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'kanban')}>
            <TabsList>
              <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="kanban"><Kanban className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add task
          </Button>
        </div>
      </div>

      {/* Priority filter */}
      <div className="flex gap-2">
        {(['all', ...PRIORITIES] as const).map((p) => (
          <Button
            key={p}
            variant={filter === p ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter(p)}
            className="capitalize"
          >
            {p}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading tasks…</div>
      ) : view === 'list' ? (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
              <Check className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">No tasks yet. Add one above!</p>
            </div>
          )}
          {filtered.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(v) => toggleTask(task.id, !!v)}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant={task.priority}>{task.priority}</Badge>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">{task.due_date}</span>
                    )}
                    {task.recurrence !== 'none' && (
                      <span className="text-xs text-info">↻ {task.recurrence}</span>
                    )}
                    {task.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-[10px]">{tag}</span>
                    ))}
                  </div>
                </div>
                <Select value={task.column_status} onValueChange={(v) => moveTask(task.id, v as Task['column_status'])}>
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteTask(task.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Kanban board */
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="glass rounded-xl p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wide ${col.color}`}>{col.label}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                  {filtered.filter((t) => t.column_status === col.key).length}
                </span>
              </div>
              <div className="space-y-2 min-h-24">
                {filtered.filter((t) => t.column_status === col.key).map((task) => (
                  <div
                    key={task.id}
                    className="glass-card p-3 cursor-pointer hover:-translate-y-0.5 transition-transform"
                  >
                    <p className="text-sm font-medium mb-2">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={task.priority} className="text-[10px]">{task.priority}</Badge>
                      {task.due_date && <span className="text-[10px] text-muted-foreground">{task.due_date}</span>}
                    </div>
                    <div className="mt-2 flex gap-1">
                      {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                        <button
                          key={c.key}
                          onClick={() => moveTask(task.id, c.key)}
                          className={`text-[10px] ${c.color} hover:underline`}
                        >
                          → {c.label}
                        </button>
                      ))}
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="ml-auto text-[10px] text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add task modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="What needs to be done?"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v as Task['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input placeholder="work, health, learning" value={newTask.tags} onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Recurrence</Label>
              <Select value={newTask.recurrence} onValueChange={(v) => setNewTask({ ...newTask, recurrence: v as Task['recurrence'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No recurrence</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addTask} disabled={saving || !newTask.title.trim()}>
              {saving ? 'Adding…' : <><Plus className="h-4 w-4" /> Add task</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
