import type { Task, Event, Habit, Goal } from '@/types/database.types';

export interface PlannerContext {
  tasks: Pick<Task, 'title' | 'priority' | 'due_date' | 'due_time' | 'completed'>[];
  events: Pick<Event, 'title' | 'start_time' | 'end_time'>[];
  habits: Pick<Habit, 'name' | 'target_per_week'>[];
  habitStreaks: Record<string, number>;
  goals: Pick<Goal, 'title' | 'current_value' | 'target_value' | 'unit'>[];
  timezone: string;
  today: string;
}

function summarizeTasks(tasks: PlannerContext['tasks']) {
  const pending = tasks.filter((t) => !t.completed);
  if (pending.length === 0) return 'No pending tasks.';
  return pending
    .map((t) => `- "${t.title}" [${t.priority} priority]${t.due_time ? ` at ${t.due_time}` : ''}`)
    .join('\n');
}

function summarizeEvents(events: PlannerContext['events']) {
  if (events.length === 0) return 'No calendar events today.';
  return events
    .map((e) => {
      const start = new Date(e.start_time);
      const end = new Date(e.end_time);
      return `- "${e.title}" from ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} to ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    })
    .join('\n');
}

function summarizeHabits(habits: PlannerContext['habits'], streaks: Record<string, number>) {
  if (habits.length === 0) return 'No active habits.';
  return habits
    .map((h) => `- ${h.name} (target ${h.target_per_week}x/week, current streak ${streaks[h.name] ?? 0} days)`)
    .join('\n');
}

function summarizeGoals(goals: PlannerContext['goals']) {
  if (goals.length === 0) return 'No active goals.';
  return goals
    .map((g) => `- ${g.title}: ${g.current_value}/${g.target_value} ${g.unit}`)
    .join('\n');
}

export function buildDailyPlanPrompt(ctx: PlannerContext) {
  return `You are an expert productivity and life-planning assistant embedded in a personal dashboard app. Generate an optimized, realistic daily schedule for ${ctx.today}.

PENDING TASKS:
${summarizeTasks(ctx.tasks)}

CALENDAR EVENTS (fixed, cannot move):
${summarizeEvents(ctx.events)}

HABITS TO FIT IN:
${summarizeHabits(ctx.habits, ctx.habitStreaks)}

ACTIVE GOALS (for context on priorities):
${summarizeGoals(ctx.goals)}

INSTRUCTIONS:
1. Build an hour-by-hour schedule from 7:00 AM to 10:00 PM.
2. Calendar events are FIXED — schedule everything else around them.
3. Place high-priority tasks in focus-friendly blocks (mornings are generally best for deep work unless the user's data suggests otherwise).
4. Fit in habits at sensible times (exercise in morning/evening, reading before bed, etc).
5. Include short breaks between intense blocks and a lunch break.
6. Be realistic — do not overschedule. Leave buffer time.
7. Output ONLY the schedule in this exact format, one line per block, no preamble or explanation:
   HH:MM AM/PM - Activity description
8. After the schedule, add a single line starting with "TIP:" containing one specific, actionable scheduling tip based on this data.`;
}

export function buildCoachingPrompt(ctx: PlannerContext & { completionRate: number }) {
  return `You are an AI productivity coach analyzing a user's life-management data. Be direct, specific, and personal — avoid generic advice.

DATA SNAPSHOT:
- Task completion rate (last 7 days): ${ctx.completionRate}%
- Pending tasks: ${ctx.tasks.filter((t) => !t.completed).length}
- Habits: ${summarizeHabits(ctx.habits, ctx.habitStreaks)}
- Goals: ${summarizeGoals(ctx.goals)}
- Today's calendar load: ${ctx.events.length} events

Provide exactly 4 short insights, each 1-2 sentences, covering:
1. A productivity pattern you notice (or would look for) in this data
2. A burnout risk warning IF the data suggests overload (calendar events + tasks combined), otherwise a sustainability observation
3. One concrete time-management suggestion
4. One motivational, specific nudge referencing their actual goals or streaks

Format as 4 short paragraphs, no headers, no bullet points, conversational tone.`;
}

export function buildWeeklyReviewPrompt(ctx: PlannerContext & { completionRate: number; tasksCompletedThisWeek: number }) {
  return `Generate a concise weekly review for a productivity dashboard user.

This week:
- ${ctx.tasksCompletedThisWeek} tasks completed
- ${ctx.completionRate}% completion rate
- Habits: ${summarizeHabits(ctx.habits, ctx.habitStreaks)}
- Goals progress: ${summarizeGoals(ctx.goals)}

Write a 3-4 sentence summary covering: what went well, what to improve, and one specific focus for next week. Be encouraging but honest. No headers or bullet points.`;
}

export function buildNoteSummaryPrompt(title: string, content: string) {
  return `Summarize the following note in 2-3 sentences, then list exactly 3 key takeaways as short bullet points (using "- " prefix).

Title: ${title}

Content:
${content}

Format:
[2-3 sentence summary paragraph]

- [takeaway 1]
- [takeaway 2]
- [takeaway 3]`;
}
