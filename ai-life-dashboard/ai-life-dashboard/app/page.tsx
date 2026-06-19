import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle2, Calendar, NotebookPen, Flame, Target, BarChart3 } from 'lucide-react';

const FEATURES = [
  { icon: CheckCircle2, title: 'Smart tasks', desc: 'Priorities, recurring tasks, Kanban & list views.' },
  { icon: Calendar, title: 'Unified calendar', desc: 'Month, week, day views with Google Calendar sync.' },
  { icon: NotebookPen, title: 'Rich notes', desc: 'Markdown editor with AI-powered summarization.' },
  { icon: Flame, title: 'Habit tracking', desc: 'Streaks, heatmaps, and weekly consistency reports.' },
  { icon: Target, title: 'Goal tracking', desc: 'Long-term goals broken into milestones with auto progress.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Productivity trends, completion rates, interactive charts.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(124,111,255,0.15),transparent_50%),radial-gradient(circle_at_80%_60%,rgba(167,139,250,0.1),transparent_50%)]" />

      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">AI Life Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link href="/signup"><Button>Get started free</Button></Link>
        </div>
      </header>

      <section className="container py-24 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Powered by AI planning
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Run your entire life from <span className="text-primary">one dashboard</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Tasks, calendar, notes, habits, and goals — combined with an AI assistant that builds your optimal day, every day.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/signup"><Button size="lg">Start free — no card required</Button></Link>
          <Link href="#features"><Button size="lg" variant="outline">See features</Button></Link>
        </div>
      </section>

      <section id="features" className="container py-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-16">
        <div className="glass-card mx-auto max-w-3xl p-10 text-center">
          <h2 className="mb-2 text-2xl font-bold">Free to start, powerful when you're ready</h2>
          <p className="mb-8 text-muted-foreground">Tasks, notes, and habits are free forever. Upgrade for AI planning and unlimited goals.</p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-6 text-left">
              <div className="mb-1 text-sm font-semibold text-muted-foreground">Free</div>
              <div className="mb-4 text-3xl font-bold">$0</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Basic tasks & Kanban</li>
                <li>Up to 5 habits</li>
                <li>Up to 3 goals</li>
                <li>Notes with search</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-primary p-6 text-left relative">
              <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Most popular</span>
              <div className="mb-1 text-sm font-semibold text-primary">Pro</div>
              <div className="mb-4 text-3xl font-bold">$12<span className="text-base font-normal text-muted-foreground">/mo</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Everything in Free</li>
                <li>AI daily planner</li>
                <li>AI coach & insights</li>
                <li>Unlimited goals & habits</li>
                <li>Advanced analytics</li>
              </ul>
            </div>
          </div>
          <Link href="/signup"><Button size="lg" className="mt-8">Get started</Button></Link>
        </div>
      </section>

      <footer className="container border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} AI Life Dashboard. All rights reserved.
      </footer>
    </main>
  );
}
