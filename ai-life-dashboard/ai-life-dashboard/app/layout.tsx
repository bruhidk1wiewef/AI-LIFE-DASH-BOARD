import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Life Dashboard — Your personal AI productivity assistant',
  description:
    'Manage tasks, calendar, notes, habits, and goals from one AI-powered dashboard. Get optimized daily plans and personalized coaching.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
