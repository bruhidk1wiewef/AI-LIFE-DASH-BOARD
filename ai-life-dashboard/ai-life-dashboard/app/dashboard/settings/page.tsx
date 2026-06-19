'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { User, CreditCard, Palette, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import type { Profile } from '@/types/database.types';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', timezone: 'UTC' });
  const [saving, setSaving] = useState(false);
  const [upgradingLoading, setUpgradingLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') toast.success('Welcome to Pro! 🎉 Your AI features are now unlocked.');
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        setForm({ full_name: data.full_name ?? '', email: data.email ?? user.email ?? '', timezone: data.timezone ?? 'UTC' });
      }
    }
    loadProfile();
  }, [searchParams]);

  async function saveProfile() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      timezone: form.timezone,
    }).eq('id', user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Profile saved!');
    setProfile((prev) => prev ? { ...prev, full_name: form.full_name, timezone: form.timezone } : prev);
  }

  async function handleUpgrade() {
    setUpgradingLoading(true);
    const res = await fetch('/api/stripe/checkout', { method: 'POST' });
    const data = await res.json();
    setUpgradingLoading(false);
    if (data.url) window.location.href = data.url;
    else toast.error('Failed to start checkout. Please try again.');
  }

  async function deleteAccount() {
    if (!confirm('Are you sure? This will permanently delete your account and all data. This cannot be undone.')) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.error('Account deletion requires contacting support@ailifedashboard.app');
  }

  const isPro = profile?.plan === 'pro';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-lg">{getInitials(form.full_name || 'U')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{form.full_name || 'No name set'}</p>
              <p className="text-sm text-muted-foreground">{form.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} disabled className="opacity-60 cursor-not-allowed" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveProfile} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4" /> Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dark mode</p>
              <p className="text-xs text-muted-foreground">Toggle between light and dark theme</p>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-medium">Pro plan active</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">All AI features unlocked · Billed monthly</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info('Manage billing via Stripe customer portal')}>
                Manage billing
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="font-semibold">Upgrade to Pro — $12/month</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>✨ AI daily schedule generator</li>
                  <li>🧠 AI productivity coach & insights</li>
                  <li>📝 AI note summarization</li>
                  <li>🎯 Unlimited goals</li>
                  <li>💪 Unlimited habits</li>
                  <li>📊 Advanced analytics</li>
                </ul>
              </div>
              <Button onClick={handleUpgrade} disabled={upgradingLoading} className="w-full">
                {upgradingLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to checkout…</> : 'Upgrade to Pro'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Shield className="h-4 w-4" /> Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">Permanently delete all your data. This cannot be undone.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={deleteAccount}>Delete account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
