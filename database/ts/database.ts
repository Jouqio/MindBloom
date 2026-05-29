// ============================================================
// MindBloom — TypeScript Database Types
// File: src/types/database.ts
// Auto-generated from PostgreSQL schema — do not edit manually
// Run: supabase gen types typescript --local > src/types/database.ts
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ─────────────────────────────────────────────────────────────────────
export type UserPlan = 'free' | 'premium' | 'pro'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired' | 'refunded'
export type MoodCategory = 'happy' | 'calm' | 'excited' | 'anxious' | 'stressed' | 'sad' | 'emotional' | 'tired'
export type EmotionValence = 'positive' | 'negative' | 'neutral' | 'mixed'
export type GardenLevel = 'seed' | 'sprout' | 'plant' | 'tree' | 'forest'
export type DevicePlatform = 'web' | 'ios' | 'android'
export type NotificationType = 'streak_reminder' | 'streak_milestone' | 'weekly_insight' | 'monthly_book_ready' | 'achievement_earned' | 'ai_insight' | 'subscription_expiring' | 'subscription_renewed' | 'welcome'
export type NotificationChannel = 'push' | 'email' | 'in_app'
export type AchievementCategory = 'streak' | 'reflection' | 'gratitude' | 'consistency' | 'growth' | 'social'
export type InsightPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type HabitFrequency = 'daily' | 'weekly' | 'custom'
export type BillingInterval = 'monthly' | 'yearly' | 'lifetime'
export type AiModel = 'gpt-4o' | 'gpt-4o-mini' | 'claude-3-5-sonnet' | 'claude-3-haiku'
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT_SENSITIVE'

// ── Database Interface ────────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {

      // ── CORE ──────────────────────────────────────────────────────────────
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          timezone: string
          locale: string
          plan: UserPlan
          onboarded_at: string | null
          last_active_at: string | null
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }

      user_preferences: {
        Row: {
          id: string
          user_id: string
          theme: string
          accent_color: string
          font_size: string
          default_soundscape: string | null
          soundscape_volumes: Json
          journal_steps_enabled: boolean[]
          auto_save_seconds: number
          notif_push_enabled: boolean
          notif_email_enabled: boolean
          notif_reminder_time: string | null
          notif_streak_alerts: boolean
          notif_weekly_insight: boolean
          ai_coach_persona: string
          ai_language: string
          allow_analytics: boolean
          allow_ai_training: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>
      }

      user_devices: {
        Row: {
          id: string
          user_id: string
          platform: DevicePlatform
          device_name: string | null
          device_id: string
          push_token: string | null
          app_version: string | null
          os_version: string | null
          is_active: boolean
          last_seen_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_devices']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['user_devices']['Insert']>
      }

      // ── JOURNAL ───────────────────────────────────────────────────────────
      journal_entries: {
        Row: {
          id: string
          user_id: string
          entry_date: string                 // DATE as ISO string
          device_platform: DevicePlatform | null
          mood_score: number | null          // 1-10
          mood_category: MoodCategory | null
          energy_score: number | null        // 0-100
          main_story: string | null
          main_story_tsv: string | null      // tsvector — do not use in client
          recurring_thoughts: string | null
          stress_source: string | null
          stress_intensity: number | null    // 1-10
          happy_moments: string | null
          lessons_learned: string | null
          did_well: string | null
          improve_on: string | null
          do_differently: string | null
          self_compassion: string | null
          tomorrow_intention: string | null
          prayer_hope: string | null
          word_count: number
          completion_pct: number             // 0-100
          is_draft: boolean
          draft_step: number | null
          is_deleted: boolean
          deleted_at: string | null
          written_duration_sec: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['journal_entries']['Row'],
          'id' | 'main_story_tsv' | 'word_count' | 'completion_pct' | 'mood_category' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['journal_entries']['Insert']>
      }

      journal_emotions: {
        Row: {
          id: string
          entry_id: string
          user_id: string
          emotion: string
          category: string
          valence: EmotionValence
          color_hex: string | null
          icon: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['journal_emotions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['journal_emotions']['Insert']>
      }

      gratitude_items: {
        Row: {
          id: string
          entry_id: string
          user_id: string
          text: string
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['gratitude_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['gratitude_items']['Insert']>
      }

      mood_logs: {
        Row: {
          id: string
          user_id: string
          entry_id: string | null
          logged_at: string
          mood_score: number
          mood_emoji: string | null
          note: string | null
          source: string
        }
        Insert: Omit<Database['public']['Tables']['mood_logs']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['mood_logs']['Insert']>
      }

      // ── GAMIFICATION ──────────────────────────────────────────────────────
      streaks: {
        Row: {
          id: string
          user_id: string
          current_streak: number
          longest_streak: number
          total_entries: number
          last_entry_date: string | null
          streak_started_at: string | null
          updated_at: string
        }
        Insert: never                        // written by trigger only
        Update: never
      }

      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          earned_at: string
          context: Json
          notified: boolean
        }
        Insert: never                        // awarded by server function only
        Update: Pick<Database['public']['Tables']['user_achievements']['Row'], 'notified'>
      }

      user_xp: {
        Row: {
          id: string
          user_id: string
          total_xp: number
          current_level: number
          xp_to_next: number
          updated_at: string
        }
        Insert: never
        Update: never
      }

      achievement_definitions: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          icon: string
          category: AchievementCategory
          condition_type: string
          condition_value: number | null
          condition_meta: Json
          sort_order: number
          is_hidden: boolean
          xp_reward: number
          plan_required: UserPlan
          created_at: string
        }
        Insert: never
        Update: never
      }

      // ── AI SYSTEM ─────────────────────────────────────────────────────────
      coach_sessions: {
        Row: {
          id: string
          user_id: string
          entry_id: string | null
          started_at: string
          ended_at: string | null
          duration_sec: number | null
          total_messages: number
          model: AiModel
          system_prompt_v: string
          tokens_input: number
          tokens_output: number
          cost_usd: number
          user_rating: number | null
          user_feedback: string | null
          was_helpful: boolean | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['coach_sessions']['Row'],
          'id' | 'total_messages' | 'tokens_input' | 'tokens_output' | 'cost_usd' | 'created_at'>
        Update: Partial<Database['public']['Tables']['coach_sessions']['Insert']>
      }

      coach_messages: {
        Row: {
          id: string
          session_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          content_tsv: string | null
          tokens: number | null
          model: AiModel | null
          finish_reason: string | null
          embedding: number[] | null         // VECTOR(1536)
          sequence_no: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['coach_messages']['Row'],
          'id' | 'content_tsv' | 'created_at'>
        Update: never
      }

      ai_user_memory: {
        Row: {
          id: string
          user_id: string
          memory_type: string
          content: string
          source_type: string
          source_id: string | null
          confidence: number
          embedding: number[] | null
          is_active: boolean
          last_referenced: string | null
          reference_count: number
          created_at: string
          updated_at: string
        }
        Insert: never                        // server-only writes
        Update: never
      }

      emotion_analysis: {
        Row: {
          id: string
          entry_id: string
          user_id: string
          stress_score: number | null
          anxiety_score: number | null
          gratitude_score: number | null
          burnout_score: number | null
          optimism_score: number | null
          overthinking_score: number | null
          self_compassion_score: number | null
          emotional_complexity: number | null
          dominant_emotion: string | null
          one_line_summary: string | null
          insight_text: string | null
          recommended_activity: string | null
          model_used: AiModel
          model_version: string | null
          prompt_version: string
          tokens_used: number | null
          processing_ms: number | null
          processed_at: string
          is_low_confidence: boolean
          needs_review: boolean
        }
        Insert: never
        Update: never
      }

      ai_insights: {
        Row: {
          id: string
          user_id: string
          period: InsightPeriod
          period_start: string
          period_end: string
          title: string
          body: string
          category: string
          emoji: string | null
          stat_value: string | null
          stat_label: string | null
          action_label: string | null
          action_url: string | null
          seen_at: string | null
          dismissed_at: string | null
          was_helpful: boolean | null
          model_used: AiModel
          generated_at: string
          expires_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['ai_insights']['Row'], 'id'>
        Update: Pick<Database['public']['Tables']['ai_insights']['Row'],
          'seen_at' | 'dismissed_at' | 'was_helpful'>
      }

      // ── PREMIUM FEATURES ──────────────────────────────────────────────────
      gardens: {
        Row: {
          id: string
          user_id: string
          level: GardenLevel
          total_plants: number
          rare_flowers: number
          xp: number
          layout: Json
          background_theme: string
          last_watered_at: string | null
          updated_at: string
        }
        Insert: never
        Update: Pick<Database['public']['Tables']['gardens']['Row'],
          'layout' | 'background_theme' | 'last_watered_at'>
      }

      garden_plants: {
        Row: {
          id: string
          user_id: string
          garden_id: string
          entry_id: string | null
          plant_type: string
          species: string | null
          color_hex: string
          size_scale: number
          source_mood: MoodCategory | null
          source_mood_score: number | null
          is_rare: boolean
          pos_x: number
          pos_y: number
          health: number
          grown_at: string
          wilted_at: string | null
        }
        Insert: never
        Update: Pick<Database['public']['Tables']['garden_plants']['Row'],
          'pos_x' | 'pos_y' | 'health' | 'wilted_at'>
      }

      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          color_hex: string
          frequency: HabitFrequency
          target_days: number[] | null
          current_streak: number
          longest_streak: number
          total_completed: number
          sort_order: number
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['habits']['Row'],
          'id' | 'current_streak' | 'longest_streak' | 'total_completed' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['habits']['Insert']>
      }

      habit_logs: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          log_date: string
          completed: boolean
          note: string | null
          mood_at_time: number | null
          completed_at: string
        }
        Insert: Omit<Database['public']['Tables']['habit_logs']['Row'], 'id'>
        Update: Pick<Database['public']['Tables']['habit_logs']['Row'], 'completed' | 'note'>
      }

      life_wheel_entries: {
        Row: {
          id: string
          user_id: string
          scores: Json                        // { career: 85, health: 60, ... }
          overall_score: number | null
          ai_analysis: string | null
          entry_date: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['life_wheel_entries']['Row'],
          'id' | 'overall_score' | 'created_at'>
        Update: Partial<Database['public']['Tables']['life_wheel_entries']['Insert']>
      }

      breathing_sessions: {
        Row: {
          id: string
          user_id: string
          technique: string
          cycles_completed: number
          duration_sec: number
          mood_before: number | null
          mood_after: number | null
          stress_before: number | null
          stress_after: number | null
          notes: string | null
          completed_at: string
        }
        Insert: Omit<Database['public']['Tables']['breathing_sessions']['Row'], 'id'>
        Update: never
      }

      // ── MEMORY VAULT ──────────────────────────────────────────────────────
      memory_books: {
        Row: {
          id: string
          user_id: string
          period_year: number
          period_month: number
          total_entries: number
          avg_mood: number | null
          avg_energy: number | null
          best_moment: string | null
          biggest_lesson: string | null
          top_gratitude: string | null
          top_person_mentioned: string | null
          biggest_achievement: string | null
          stress_theme: string | null
          ai_narrative: string | null
          ai_mood_story: string | null
          growth_summary: string | null
          highlights_json: Json
          emotion_distribution: Json
          mood_heatmap: Json
          generated_at: string | null
          is_ready: boolean
          pdf_url: string | null
          share_token: string | null
          created_at: string
        }
        Insert: never                        // generated by server function
        Update: Pick<Database['public']['Tables']['memory_books']['Row'],
          'ai_narrative' | 'ai_mood_story' | 'growth_summary' | 'is_ready' | 'pdf_url'>
      }

      // ── BILLING ───────────────────────────────────────────────────────────
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan: UserPlan
          status: SubscriptionStatus
          billing_interval: BillingInterval | null
          trial_started_at: string | null
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          canceled_at: string | null
          cancel_at_period_end: boolean
          midtrans_customer_id: string | null
          midtrans_sub_id: string | null
          source: string
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
      }

      payment_transactions: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          amount: number
          currency: string
          midtrans_order_id: string
          midtrans_txn_id: string | null
          payment_type: string | null
          va_number: string | null
          status: PaymentStatus
          paid_at: string | null
          expired_at: string | null
          failed_reason: string | null
          refunded_at: string | null
          refund_amount: number | null
          gateway_payload: Json
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
      }

      plan_definitions: {
        Row: {
          id: string
          slug: UserPlan
          name: string
          price_monthly: number
          price_yearly: number
          price_lifetime: number
          features: Json
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: never
        Update: never
      }

      // ── NOTIFICATIONS ─────────────────────────────────────────────────────
      notification_queue: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          type: NotificationType
          channel: NotificationChannel
          title: string
          body: string
          data: Json
          scheduled_at: string
          sent_at: string | null
          failed_at: string | null
          failure_reason: string | null
          retry_count: number
          max_retries: number
          read_at: string | null
          dismissed_at: string | null
          device_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notification_queue']['Row'],
          'id' | 'sent_at' | 'failed_at' | 'retry_count' | 'created_at'>
        Update: Pick<Database['public']['Tables']['notification_queue']['Row'],
          'read_at' | 'dismissed_at' | 'sent_at' | 'failed_at' | 'failure_reason' | 'retry_count'>
      }

      // ── CONFIG ────────────────────────────────────────────────────────────
      feature_flags: {
        Row: {
          id: string
          slug: string
          description: string | null
          enabled_globally: boolean
          enabled_plans: UserPlan[]
          rollout_pct: number | null
          owner_team: string
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
      }

      app_config: {
        Row: {
          key: string
          value: Json
          description: string | null
          is_public: boolean
          updated_at: string
        }
        Insert: never
        Update: never
      }
    }

    Views: {
      mv_daily_user_stats: {
        Row: {
          user_id: string
          entry_date: string
          mood_score: number | null
          mood_category: MoodCategory | null
          energy_score: number | null
          stress_intensity: number | null
          word_count: number
          completion_pct: number
          gratitude_count: number
          emotion_count: number
          stress_score: number | null
          anxiety_score: number | null
          gratitude_score: number | null
          burnout_score: number | null
          optimism_score: number | null
          overthinking_score: number | null
          streak_at_time: number | null
          habits_done: number
        }
      }

      mv_weekly_user_stats: {
        Row: {
          user_id: string
          week_start: string
          entries_count: number
          avg_mood: number | null
          avg_energy: number | null
          avg_stress: number | null
          avg_gratitude: number | null
          total_words: number
          max_streak: number | null
          avg_stress_ai: number | null
          avg_anxiety_ai: number | null
          avg_optimism_ai: number | null
        }
      }
    }

    Functions: {
      get_mood_calendar: {
        Args: { p_user_id: string; p_year: number; p_month: number }
        Returns: Array<{
          entry_date: string
          mood_score: number
          mood_category: MoodCategory
          has_journal: boolean
        }>
      }
      get_dashboard_data: {
        Args: { p_user_id: string }
        Returns: Json
      }
      search_journals_semantic: {
        Args: {
          p_user_id: string
          p_embedding: number[]
          p_limit?: number
          p_threshold?: number
        }
        Returns: Array<{
          entry_id: string
          entry_date: string
          similarity: number
          snippet: string
        }>
      }
      search_journals_text: {
        Args: { p_user_id: string; p_query: string; p_limit?: number }
        Returns: Array<{
          entry_id: string
          entry_date: string
          rank: number
          snippet: string
        }>
      }
      check_feature: {
        Args: { p_user_id: string; p_slug: string }
        Returns: boolean
      }
    }
  }
}

// ── Convenience type aliases ──────────────────────────────────────────────────
export type Profile = Database['public']['Tables']['profiles']['Row']
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
export type JournalEmotion = Database['public']['Tables']['journal_emotions']['Row']
export type GratitudeItem = Database['public']['Tables']['gratitude_items']['Row']
export type MoodLog = Database['public']['Tables']['mood_logs']['Row']
export type Streak = Database['public']['Tables']['streaks']['Row']
export type Achievement = Database['public']['Tables']['user_achievements']['Row']
export type AchievementDef = Database['public']['Tables']['achievement_definitions']['Row']
export type UserXP = Database['public']['Tables']['user_xp']['Row']
export type CoachSession = Database['public']['Tables']['coach_sessions']['Row']
export type CoachMessage = Database['public']['Tables']['coach_messages']['Row']
export type AIMemory = Database['public']['Tables']['ai_user_memory']['Row']
export type EmotionAnalysis = Database['public']['Tables']['emotion_analysis']['Row']
export type AIInsight = Database['public']['Tables']['ai_insights']['Row']
export type Garden = Database['public']['Tables']['gardens']['Row']
export type GardenPlant = Database['public']['Tables']['garden_plants']['Row']
export type Habit = Database['public']['Tables']['habits']['Row']
export type HabitLog = Database['public']['Tables']['habit_logs']['Row']
export type LifeWheelEntry = Database['public']['Tables']['life_wheel_entries']['Row']
export type MemoryBook = Database['public']['Tables']['memory_books']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type PaymentTransaction = Database['public']['Tables']['payment_transactions']['Row']
export type PlanDefinition = Database['public']['Tables']['plan_definitions']['Row']
export type NotificationItem = Database['public']['Tables']['notification_queue']['Row']
export type FeatureFlag = Database['public']['Tables']['feature_flags']['Row']

// ── Insert / Update helper types ──────────────────────────────────────────────
export type JournalInsert = Database['public']['Tables']['journal_entries']['Insert']
export type JournalUpdate = Database['public']['Tables']['journal_entries']['Update']
export type HabitInsert = Database['public']['Tables']['habits']['Insert']
export type EmotionInsert = Database['public']['Tables']['journal_emotions']['Insert']
export type GratitudeInsert = Database['public']['Tables']['gratitude_items']['Insert']
export type LifeWheelInsert = Database['public']['Tables']['life_wheel_entries']['Insert']
export type BreathingInsert = Database['public']['Tables']['breathing_sessions']['Insert']
export type MoodLogInsert = Database['public']['Tables']['mood_logs']['Insert']

// ── Composite types used by API responses ─────────────────────────────────────
export type JournalEntryFull = JournalEntry & {
  emotions: JournalEmotion[]
  gratitude_items: GratitudeItem[]
  emotion_analysis: EmotionAnalysis | null
  coach_sessions: Pick<CoachSession, 'id' | 'started_at' | 'total_messages'>[]
}

export type DashboardData = {
  streak: Pick<Streak, 'current_streak' | 'longest_streak' | 'total_entries'>
  mood_today: { score: number; category: MoodCategory } | null
  xp: Pick<UserXP, 'total_xp' | 'current_level'>
  garden_level: GardenLevel
  weekly_avg_mood: number | null
  unread_insights: number
  pending_achievements: number
}

export type MoodCalendarDay = {
  entry_date: string
  mood_score: number
  mood_category: MoodCategory
  has_journal: boolean
}

export type LifeWheelScores = {
  career: number
  health: number
  family: number
  finance: number
  spiritual: number
  relationships: number
  learning: number
  happiness: number
}
