export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskColumn = 'todo' | 'in_progress' | 'done';
export type RecurrenceFreq = 'none' | 'daily' | 'weekly' | 'monthly';
export type GoalStatus = 'active' | 'completed' | 'archived';
export type NotificationType =
  | 'task_reminder'
  | 'habit_reminder'
  | 'goal_milestone'
  | 'ai_recommendation'
  | 'event_reminder';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          email: string | null;
          plan: 'free' | 'pro';
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          timezone: string | null;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          priority: TaskPriority;
          column_status: TaskColumn;
          due_date: string | null;
          due_time: string | null;
          completed: boolean;
          completed_at: string | null;
          tags: string[];
          recurrence: RecurrenceFreq;
          recurrence_parent_id: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tasks']['Row']> & { user_id: string; title: string };
        Update: Partial<Database['public']['Tables']['tasks']['Row']>;
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          location: string | null;
          start_time: string;
          end_time: string;
          all_day: boolean;
          color: string;
          google_event_id: string | null;
          reminder_minutes_before: number | null;
          recurrence: RecurrenceFreq;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['events']['Row']> & {
          user_id: string;
          title: string;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Database['public']['Tables']['events']['Row']>;
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          content_format: 'markdown' | 'richtext';
          category: string;
          ai_summary: string | null;
          ai_summary_generated_at: string | null;
          pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notes']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['notes']['Row']>;
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          target_per_week: number;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['habits']['Row']> & { user_id: string; name: string };
        Update: Partial<Database['public']['Tables']['habits']['Row']>;
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          completed_on: string;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['habit_logs']['Row']> & {
          habit_id: string;
          user_id: string;
          completed_on: string;
        };
        Update: Partial<Database['public']['Tables']['habit_logs']['Row']>;
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string;
          target_value: number;
          current_value: number;
          unit: string;
          deadline: string | null;
          status: GoalStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['goals']['Row']> & { user_id: string; title: string };
        Update: Partial<Database['public']['Tables']['goals']['Row']>;
      };
      milestones: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          title: string;
          completed: boolean;
          completed_at: string | null;
          position: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['milestones']['Row']> & {
          goal_id: string;
          user_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['milestones']['Row']>;
      };
      ai_plans: {
        Row: {
          id: string;
          user_id: string;
          plan_date: string;
          plan_type: 'daily_schedule' | 'weekly_review' | 'coaching_insight';
          content: string;
          input_snapshot: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['ai_plans']['Row']> & { user_id: string; content: string };
        Update: Partial<Database['public']['Tables']['ai_plans']['Row']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string | null;
          read: boolean;
          related_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notifications']['Row']> & {
          user_id: string;
          type: NotificationType;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
    };
    Views: {
      daily_stats: {
        Row: {
          user_id: string;
          stat_date: string;
          total_tasks: number;
          completed_tasks: number;
        };
      };
    };
    Functions: {
      get_habit_streak: {
        Args: { p_habit_id: string };
        Returns: number;
      };
    };
  };
}

export type Task = Database['public']['Tables']['tasks']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type Habit = Database['public']['Tables']['habits']['Row'];
export type HabitLog = Database['public']['Tables']['habit_logs']['Row'];
export type Goal = Database['public']['Tables']['goals']['Row'];
export type Milestone = Database['public']['Tables']['milestones']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type AiPlan = Database['public']['Tables']['ai_plans']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
