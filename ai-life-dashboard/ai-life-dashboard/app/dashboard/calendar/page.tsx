'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Event } from '@/types/database.types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COLORS = [
  { label: 'Purple', value: '#7c6fff' },
  { label: 'Green', value: '#34d399' },
  { label: 'Blue', value: '#60a5fa' },
  { label: 'Orange', value: '#fb923c' },
  { label: 'Pink', value: '#f472b6' },
];

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [date, setDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({
    title: '', date: new Date().toISOString().split('T')[0],
    startHour: '09', startMin: '00', endHour: '10', endMin: '00',
    color: '#7c6fff', description: '', location: '',
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const year = date.getFullYear();
    const month = date.getMonth();
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const res = await fetch(`/api/events?from=${from}&to=${to}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function addEvent() {
    if (!newEvent.title.trim()) return;
    const start = `${newEvent.date}T${newEvent.startHour}:${newEvent.startMin}:00`;
    const end = `${newEvent.date}T${newEvent.endHour}:${newEvent.endMin}:00`;
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newEvent.title,
        start_time: start,
        end_time: end,
        color: newEvent.color,
        description: newEvent.description || null,
        location: newEvent.location || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.message ?? data.error); return; }
    setEvents((prev) => [...prev, data.event].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setShowAdd(false);
    toast.success('Event added!');
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success('Event deleted.');
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const calCells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (calCells.length % 7 !== 0) calCells.push(null);

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function eventsOnDay(day: number) {
    const ds = dateStr(day);
    return events.filter((e) => e.start_time.startsWith(ds));
  }

  const upcomingEvents = [...events].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add event</Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setDate(new Date(year, month - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base font-semibold">{MONTHS[month]} {year}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setDate(new Date(year, month + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
            {calCells.map((day, i) => {
              if (!day) return <div key={i} className="h-20" />;
              const ds = dateStr(day);
              const dayEvents = eventsOnDay(day);
              const isToday = ds === today;
              return (
                <div
                  key={i}
                  className={cn(
                    'h-20 overflow-hidden rounded-lg border p-1 transition-colors hover:bg-accent/5 cursor-pointer',
                    isToday ? 'border-primary bg-primary/5' : 'border-transparent'
                  )}
                  onClick={() => { setNewEvent((prev) => ({ ...prev, date: ds })); setShowAdd(true); }}
                >
                  <span className={cn(
                    'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium',
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  )}>{day}</span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className="truncate rounded px-1 text-[10px] font-medium"
                        style={{ background: e.color + '33', color: e.color }}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming events list */}
      <Card>
        <CardHeader><CardTitle>Upcoming events</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No events this month</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="h-10 w-1 rounded-full shrink-0" style={{ background: e.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(e.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}
                      {new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {' – '}
                      {new Date(e.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteEvent(e.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Event title</Label>
              <Input placeholder="Event name" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <div className="flex gap-1">
                  <Input className="w-16" maxLength={2} placeholder="09" value={newEvent.startHour} onChange={(e) => setNewEvent({ ...newEvent, startHour: e.target.value })} />
                  <span className="flex items-center text-muted-foreground">:</span>
                  <Input className="w-16" maxLength={2} placeholder="00" value={newEvent.startMin} onChange={(e) => setNewEvent({ ...newEvent, startMin: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <div className="flex gap-1">
                  <Input className="w-16" maxLength={2} placeholder="10" value={newEvent.endHour} onChange={(e) => setNewEvent({ ...newEvent, endHour: e.target.value })} />
                  <span className="flex items-center text-muted-foreground">:</span>
                  <Input className="w-16" maxLength={2} placeholder="00" value={newEvent.endMin} onChange={(e) => setNewEvent({ ...newEvent, endMin: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Select value={newEvent.color} onValueChange={(v) => setNewEvent({ ...newEvent, color: v })}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: newEvent.color }} />
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
                <Label>Location (optional)</Label>
                <Input placeholder="Meeting room, Zoom…" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addEvent} disabled={!newEvent.title.trim()}><Plus className="h-4 w-4" /> Add event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
