'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { BarChart3, Target, CheckCircle2, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { calcPercent } from '@/lib/utils';

interface Stats {
  weeklyTasks: { day: string; completed: number; total: number }[];
  habitConsistency: { name: string; pct: number; color: string }[];
  goals: { title: string; pct: number; category: string }[];
  summary: { avgPerDay: number; completionRate: number; topStreak: number; goalsOnTrack: number; totalGoals: number };
}

const PLACEHOLDER: Stats = {
  weeklyTasks: [
    { day: 'Mon', completed: 6, total: 8 },
    { day: 'Tue', completed: 9, total: 11 },
    { day: 'Wed', completed: 5, total: 7 },
    { day: 'Thu', completed: 8, total: 9 },
    { day: 'Fri', completed: 7, total: 10 },
    { day: 'Sat', completed: 4, total: 5 },
    { day: 'Sun', completed: 3, total: 3 },
  ],
  habitConsistency: [],
  goals: [],
  summary: { avgPerDay: 6.0, completionRate: 74, topStreak: 0, goalsOnTrack: 0, totalGoals: 0 },
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats>(PLACEHOLDER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const [habitsRes, goalsRes] = await Promise.all([
        fetch('/api/habits'),
        fetch('/api/goals'),
      ]);
      const habitsData = await habitsRes.json();
      const goalsData = await goalsRes.json();

      const habits = habitsData.habits ?? [];
      const goals = goalsData.goals ?? [];

      const topStreak = habits.reduce((max: number, h: { streak: number }) => Math.max(max, h.streak), 0);
      const goalsOnTrack = goals.filter((g: { current_value: number; target_value: number }) => calcPercent(g.current_value, g.target_value) >= 50).length;

      const habitConsistency = habits.map((h: { name: string; color: string; completedDays: string[] }) => ({
        name: h.name,
        color: h.color,
        pct: Math.round((h.completedDays.filter((d: string) => {
          const dDate = new Date(d);
          return (Date.now() - dDate.getTime()) < 28 * 86400000;
        }).length / 28) * 100),
      }));

      const goalStats = goals.map((g: { title: string; current_value: number; target_value: number; category: string }) => ({
        title: g.title,
        pct: calcPercent(g.current_value, g.target_value),
        category: g.category,
      }));

      setStats((prev) => ({
        ...prev,
        habitConsistency,
        goals: goalStats,
        summary: {
          ...prev.summary,
          topStreak,
          goalsOnTrack,
          totalGoals: goals.length,
        },
      }));
      setLoading(false);
    }
    load();
  }, []);

  const STAT_CARDS = [
    { label: 'Avg tasks/day', value: stats.summary.avgPerDay.toFixed(1), icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Completion rate', value: `${stats.summary.completionRate}%`, icon: BarChart3, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Top habit streak', value: `${stats.summary.topStreak}d`, icon: Flame, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Goals on track', value: `${stats.summary.goalsOnTrack}/${stats.summary.totalGoals}`, icon: Target, color: 'text-success', bg: 'bg-success/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Your productivity at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weekly task completion bar chart */}
        <Card>
          <CardHeader><CardTitle>Task completion — this week</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.weeklyTasks} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="total" fill="rgba(124,111,255,0.2)" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="completed" fill="#7c6fff" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion rate trend line */}
        <Card>
          <CardHeader><CardTitle>Completion rate trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={stats.weeklyTasks.map((d) => ({
                  day: d.day,
                  rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
                }))}
                margin={{ top: 5, right: 5, bottom: 5, left: -25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, 'Rate']}
                />
                <Line type="monotone" dataKey="rate" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Habit consistency */}
        <Card>
          <CardHeader><CardTitle>Habit consistency (28 days)</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : stats.habitConsistency.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Add habits to see consistency data</p>
            ) : (
              <div className="space-y-4">
                {stats.habitConsistency.map((h) => (
                  <div key={h.name} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-sm text-muted-foreground truncate">{h.name}</span>
                    <Progress value={h.pct} className="flex-1" />
                    <span className="w-9 shrink-0 text-right text-xs font-medium" style={{ color: h.color }}>{h.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals overview */}
        <Card>
          <CardHeader><CardTitle>Goals overview</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : stats.goals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Add goals to see progress data</p>
            ) : (
              <div className="space-y-4">
                {stats.goals.map((g) => (
                  <div key={g.title}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium truncate">{g.title}</span>
                      <span className="text-xs font-bold text-primary ml-2 shrink-0">{g.pct}%</span>
                    </div>
                    <Progress value={g.pct} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
