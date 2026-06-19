import { createClient, getUser, getProfile } from '@/lib/supabase/server';
import { calcPercent, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Flame, Target, BarChart3, Sparkles, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const revalidate = 0;

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) return null;
  const profile = await getProfile();

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const todayStart = `${today}T00:00:00`;
  const todayEnd = `${today}T23:59:59`;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const [tasksRes, eventsRes, habitsRes, goalsRes, recentTasksRes] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', user.id).eq('due_date', today).order('priority'),
    supabase.from('events').select('*').eq('user_id', user.id).gte('start_time', todayStart).lte('start_time', todayEnd).order('start_time'),
    supabase.from('habits').select('*, habit_logs(completed_on)').eq('user_id', user.id).eq('archived', false),
    supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active'),
    supabase.from('tasks').select('completed').eq('user_id', user.id).gte('due_date', weekAgo).lte('due_date', today),
  ]);

  const todayTasks = tasksRes.data ?? [];
  const todayEvents = eventsRes.data ?? [];
  const habits = habitsRes.data ?? [];
  const goals = goalsRes.data ?? [];
  const recent = recentTasksRes.data ?? [];

  const doneTasks = todayTasks.filter((t) => t.completed).length;
  const habitsDoneToday = habits.filter((h) =>
    (h.habit_logs as { completed_on: string }[]).some((l) => l.completed_on === today)
  ).length;
  const avgGoalPct = goals.length > 0
    ? Math.round(goals.reduce((a, g) => a + calcPercent(g.current_value, g.target_value), 0) / goals.length)
    : 0;
  const weekCompletion = recent.length > 0
    ? Math.round((recent.filter((t) => t.completed).length / recent.length) * 100)
    : 0;
  const productivityScore = Math.round(
    (doneTasks / Math.max(todayTasks.length, 1)) * 40 +
    (habitsDoneToday / Math.max(habits.length, 1)) * 35 +
    (avgGoalPct / 100) * 25
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const STAT_CARDS = [
    {
      label: 'Productivity score',
      value: `${productivityScore}%`,
      icon: BarChart3,
      color: 'text-primary',
      bg: 'bg-primary/10',
      sub: 'Today',
    },
    {
      label: 'Tasks completed',
      value: `${doneTasks}/${todayTasks.length}`,
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10',
      sub: 'Today',
    },
    {
      label: 'Habits logged',
      value: `${habitsDoneToday}/${habits.length}`,
      icon: Flame,
      color: 'text-warning',
      bg: 'bg-warning/10',
      sub: 'Today',
    },
    {
      label: 'Avg goal progress',
      value: `${avgGoalPct}%`,
      icon: Target,
      color: 'text-info',
      bg: 'bg-info/10',
      sub: `${goals.length} active goals`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}, {firstName} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">{formatDate(new Date())} — Here's your life overview</p>
      </div>

      {/* AI Summary card */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">AI Summary</p>
            <p className="text-sm leading-relaxed text-foreground/90">
              {todayTasks.filter((t) => !t.completed).length > 0
                ? `You have ${todayTasks.filter((t) => !t.completed).length} task${todayTasks.filter((t) => !t.completed).length !== 1 ? 's' : ''} remaining today`
                : 'All tasks done for today 🎉'}
              {todayEvents.length > 0 && `, ${todayEvents.length} meeting${todayEvents.length !== 1 ? 's' : ''}`}
              {goals.length > 0 && `, and ${avgGoalPct}% on track toward your goals`}.
              {weekCompletion >= 70
                ? ` Your ${weekCompletion}% completion rate this week is excellent — keep the momentum.`
                : weekCompletion > 0
                ? ` You're at ${weekCompletion}% task completion this week — morning blocks tend to be most effective.`
                : ''}
            </p>
          </div>
        </div>
        {profile?.plan !== 'pro' && (
          <Link href="/dashboard/ai-planner">
            <Button size="sm" variant="outline" className="mt-3 border-primary/40 text-primary hover:bg-primary/10">
              <Sparkles className="h-3.5 w-3.5" /> Generate AI daily plan (Pro)
            </Button>
          </Link>
        )}
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
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-info" /> Today's schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No events today</p>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <div className="h-10 w-1 rounded-full shrink-0" style={{ background: e.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Today's tasks
              <Link href="/dashboard/tasks" className="ml-auto text-xs font-normal text-primary hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tasks due today</p>
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <div className={`h-3.5 w-3.5 shrink-0 rounded-sm border ${t.completed ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`} />
                    <span className={`flex-1 truncate text-sm ${t.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {t.title}
                    </span>
                    <Badge variant={t.priority as 'high' | 'medium' | 'low'}>{t.priority}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Habit streaks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-warning" /> Habit streaks
              <Link href="/dashboard/habits" className="ml-auto text-xs font-normal text-primary hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {habits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No habits yet</p>
            ) : (
              <div className="space-y-3">
                {habits.slice(0, 4).map((h) => {
                  const logs = h.habit_logs as { completed_on: string }[];
                  const last28 = logs.filter((l) => {
                    const d = new Date(l.completed_on);
                    return (Date.now() - d.getTime()) < 28 * 86400000;
                  }).length;
                  const pct = Math.round((last28 / 28) * 100);
                  const doneToday = logs.some((l) => l.completed_on === today);
                  return (
                    <div key={h.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: h.color + '22' }}>
                        <Flame className="h-4 w-4" style={{ color: h.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{h.name}</span>
                          <span className="text-xs" style={{ color: h.color }}>{pct}%</span>
                        </div>
                        <Progress value={pct} indicatorClassName="" style={{ '--tw-bg-opacity': 1 } as React.CSSProperties} />
                      </div>
                      {doneToday && <span className="text-xs text-success">✓</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-info" /> Active goals
              <Link href="/dashboard/goals" className="ml-auto text-xs font-normal text-primary hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No active goals</p>
            ) : (
              <div className="space-y-4">
                {goals.slice(0, 3).map((g) => {
                  const pct = calcPercent(g.current_value, g.target_value);
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium truncate">{g.title}</span>
                        <span className="text-xs text-primary ml-2 shrink-0">{pct}%</span>
                      </div>
                      <Progress value={pct} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {g.current_value}/{g.target_value} {g.unit}
                        {g.deadline && ` · due ${formatDate(g.deadline)}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
