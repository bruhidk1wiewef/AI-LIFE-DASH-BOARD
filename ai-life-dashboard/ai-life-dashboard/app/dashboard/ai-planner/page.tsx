'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, RefreshCw, Brain, MessageCircle, Send, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

export default function AIPlannerPage() {
  const [plan, setPlan] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check plan + load cached daily plan
  useEffect(() => {
    async function init() {
      // Get today's cached plan
      const res = await fetch('/api/ai/plan');
      const data = await res.json();
      if (data.plan) setPlan(data.plan);
      // Infer pro status from a 402 response later; default optimistic
      setIsPro(true);
    }
    init();
  }, []);

  async function generatePlan() {
    setLoadingPlan(true);
    const res = await fetch('/api/ai/plan', { method: 'POST' });
    const data = await res.json();
    setLoadingPlan(false);
    if (res.status === 402) { setIsPro(false); return; }
    if (!res.ok) { toast.error(data.message ?? 'Failed to generate plan'); return; }
    setPlan(data.plan);
    toast.success('Daily plan generated!');
  }

  async function getInsight() {
    setLoadingInsight(true);
    const res = await fetch('/api/ai/coach', { method: 'POST' });
    const data = await res.json();
    setLoadingInsight(false);
    if (res.status === 402) { setIsPro(false); return; }
    if (!res.ok) { toast.error(data.message ?? 'Failed to get insights'); return; }
    setInsight(data.insight);
    toast.success('Coaching insights ready!');
  }

  async function sendChat() {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);

    // Simple passthrough to AI coach endpoint with chat context
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatMessage: msg, chatHistory }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatHistory([...newHistory, { role: 'assistant', content: data.insight }]);
      } else {
        setChatHistory([...newHistory, { role: 'assistant', content: 'I could not respond right now. Please try again.' }]);
      }
    } catch {
      setChatHistory([...newHistory, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  const UpgradePrompt = () => (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-1 font-semibold">Pro feature</h3>
      <p className="mb-4 text-sm text-muted-foreground max-w-xs">
        AI Planning and Coaching are available on the Pro plan. Upgrade to unlock personalized AI guidance.
      </p>
      <Button>Upgrade to Pro — $12/mo</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">AI Planner</h1>
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">Powered by GPT-4o</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Your AI analyzes tasks, habits, goals, and calendar to optimize your day.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily plan */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Today's schedule
              </CardTitle>
              <Button size="sm" onClick={generatePlan} disabled={loadingPlan}>
                {loadingPlan ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                ) : plan ? (
                  <><RefreshCw className="h-3.5 w-3.5" /> Regenerate</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" /> Generate</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isPro === false ? <UpgradePrompt /> : plan ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{plan}</pre>
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <Sparkles className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">Click Generate to create your AI-optimized daily schedule</p>
                <p className="mt-1 text-xs">Analyzes your tasks, calendar, habits, and goals</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coaching insights */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-pink-500" /> AI Coach
              </CardTitle>
              <Button size="sm" variant="outline" onClick={getInsight} disabled={loadingInsight}>
                {loadingInsight ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5 text-primary" /> Get insights</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isPro === false ? <UpgradePrompt /> : insight ? (
              <p className="text-sm leading-relaxed">{insight}</p>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Brain className="mx-auto mb-2 h-8 w-8 opacity-30" />
                <p className="text-xs">Get personalized productivity insights and coaching based on your data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-info" /> Chat with AI assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPro === false ? <UpgradePrompt /> : (
              <>
                <div className="mb-3 min-h-32 max-h-48 space-y-2 overflow-y-auto scrollbar-thin">
                  {chatHistory.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      Ask me about your schedule, how to prioritize tasks, or get advice on your goals
                    </p>
                  ) : (
                    chatHistory.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'glass text-foreground'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="glass rounded-xl px-3 py-2">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask your AI assistant…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                    className="text-sm"
                  />
                  <Button size="icon" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
