'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, getInitials } from '@/lib/utils';
import { useTheme } from 'next-themes';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database.types';
import {
  LayoutDashboard, CheckSquare, CalendarDays, NotebookPen, Flame,
  Target, Sparkles, BarChart3, Settings, LogOut, Sun, Moon, Zap,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/dashboard/calendar', icon: CalendarDays, label: 'Calendar' },
  { href: '/dashboard/notes', icon: NotebookPen, label: 'Notes' },
  { href: '/dashboard/habits', icon: Flame, label: 'Habits' },
  { href: '/dashboard/goals', icon: Target, label: 'Goals' },
  { href: '/dashboard/ai-planner', icon: Sparkles, label: 'AI Planner', pro: true },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  user: User;
  profile: Profile | null;
}

export function Sidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isPro = profile?.plan === 'pro';

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('Signed out.');
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card/50 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">AI Life</p>
          <p className="text-xs text-primary font-semibold leading-tight">Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map(({ href, icon: Icon, label, pro }) => {
          const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute left-3 h-4 w-0.5 rounded-full bg-primary" style={{ marginLeft: -12 }} />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {pro && !isPro && (
                <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                  PRO
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Plan badge */}
        {!isPro && (
          <Link href="/dashboard/settings">
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 hover:bg-primary/15 transition-colors">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Upgrade to Pro</span>
            </div>
          </Link>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="text-sm">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </Button>

        {/* User */}
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(profile?.full_name ?? user.email ?? 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{profile?.full_name ?? 'User'}</p>
            <p className="truncate text-[10px] text-muted-foreground">{isPro ? '⭐ Pro' : 'Free plan'}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
