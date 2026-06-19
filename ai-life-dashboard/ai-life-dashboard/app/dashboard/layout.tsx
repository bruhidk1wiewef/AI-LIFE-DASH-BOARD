import { redirect } from 'next/navigation';
import { getUser, getProfile } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { NotificationBell } from '@/components/layout/notification-bell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const profile = await getProfile();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} profile={profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-end border-b border-border px-6 py-3 shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-6xl p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
