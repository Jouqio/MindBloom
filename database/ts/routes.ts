// ============================================================
// MindBloom — API Routes, Supabase Clients & React Hooks
// ============================================================

// ── FILE: src/lib/supabase/client.ts ─────────────────────────────────────────
// Browser-side Supabase client (uses anon key)
/*
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
*/

// ── FILE: src/lib/supabase/server.ts ─────────────────────────────────────────
// Server-side Supabase client (uses cookies for SSR auth)
/*
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}
*/

// ── FILE: src/lib/supabase/middleware.ts ──────────────────────────────────────
// Auth middleware — protects routes, refreshes session
/*
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/dashboard', '/journal', '/garden', '/coach', '/insights', '/memory', '/settings']
const AUTH_PATHS = ['/login', '/signup']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.delete({ name, ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (!user && PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return response
}
*/

// ── FILE: src/app/api/journals/route.ts ──────────────────────────────────────
/*
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const journalInsertSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood_score: z.number().min(1).max(10).nullable(),
  energy_score: z.number().min(0).max(100).nullable(),
  main_story: z.string().max(10000).nullable(),
  recurring_thoughts: z.string().max(5000).nullable(),
  stress_source: z.string().max(5000).nullable(),
  stress_intensity: z.number().min(1).max(10).nullable(),
  happy_moments: z.string().max(5000).nullable(),
  lessons_learned: z.string().max(5000).nullable(),
  did_well: z.string().max(3000).nullable(),
  improve_on: z.string().max(3000).nullable(),
  do_differently: z.string().max(3000).nullable(),
  self_compassion: z.string().max(5000).nullable(),
  tomorrow_intention: z.string().max(3000).nullable(),
  prayer_hope: z.string().max(5000).nullable(),
  is_draft: z.boolean().default(false),
  draft_step: z.number().min(1).max(15).nullable(),
  written_duration_sec: z.number().nullable(),
  device_platform: z.enum(['web', 'ios', 'android']).default('web'),
})

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  let query = supabase
    .from('journal_entries')
    .select(`
      id, entry_date, mood_score, mood_category, energy_score,
      word_count, completion_pct, is_draft, created_at, updated_at,
      journal_emotions(emotion, category, valence, color_hex),
      gratitude_items(text, sort_order)
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .eq('is_draft', false)
    .order('entry_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (month && year) {
    query = query
      .gte('entry_date', `${year}-${month.padStart(2, '0')}-01`)
      .lt('entry_date', `${year}-${(parseInt(month) + 1).toString().padStart(2, '0')}-01`)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, limit, offset })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const validation = journalInsertSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
  }

  const payload = { ...validation.data, user_id: user.id }

  const { data, error } = await supabase
    .from('journal_entries')
    .upsert(payload, { onConflict: 'user_id,entry_date,is_draft' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
*/

// ── FILE: src/app/api/journals/[id]/route.ts ─────────────────────────────────
/*
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      *,
      journal_emotions(*),
      gratitude_items(*),
      journal_affirmations(*),
      emotion_analysis(*),
      coach_sessions(id, started_at, total_messages)
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)      // RLS also enforces this
    .eq('is_deleted', false)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('journal_entries')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Soft delete only
  const { error } = await supabase
    .from('journal_entries')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
*/

// ── FILE: src/app/api/dashboard/route.ts ─────────────────────────────────────
/*
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.rpc('get_dashboard_data', { p_user_id: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
*/

// ── FILE: src/hooks/useJournal.ts ─────────────────────────────────────────────
/*
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { JournalEntry, JournalInsert } from '@/types/database'

export function useJournal() {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveJournal = useCallback(async (payload: JournalInsert) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error)
      return data as JournalEntry
    } catch (e: any) {
      setError(e.message)
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  const autoSave = useCallback(
    async (entryId: string | null, step: number, fields: Partial<JournalInsert>) => {
      if (entryId) {
        await fetch(`/api/journals/${entryId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fields, is_draft: true, draft_step: step }),
        })
      }
    }, []
  )

  return { saveJournal, autoSave, saving, error }
}
*/

// ── FILE: src/hooks/useDashboard.ts ───────────────────────────────────────────
/*
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DashboardData } from '@/types/database'

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      setData(json.data)
      setLoading(false)
    }
    load()

    // Realtime: re-fetch when journal_entries changes
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'journal_entries'
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { data, loading }
}
*/

// ── FILE: src/hooks/useMoodCalendar.ts ────────────────────────────────────────
/*
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MoodCalendarDay } from '@/types/database'

export function useMoodCalendar(year: number, month: number) {
  const [days, setDays] = useState<MoodCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.rpc('get_mood_calendar', {
        p_user_id: user.id, p_year: year, p_month: month
      })
      setDays(data || [])
      setLoading(false)
    }
    load()
  }, [year, month])

  return { days, loading }
}
*/

// ── FILE: src/store/journalStore.ts ───────────────────────────────────────────
// Zustand store for journal form state across 15 steps
/*
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JournalInsert, LifeWheelScores } from '@/types/database'

interface JournalDraft extends Partial<JournalInsert> {
  emotions: string[]
  gratitude_items: string[]
  affirmations: string[]
}

interface JournalStore {
  currentStep: number
  draft: JournalDraft
  entryId: string | null
  isSaving: boolean

  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateDraft: (fields: Partial<JournalDraft>) => void
  setEntryId: (id: string) => void
  resetDraft: () => void
}

const emptyDraft: JournalDraft = {
  entry_date: new Date().toISOString().split('T')[0],
  is_draft: true,
  draft_step: 1,
  emotions: [],
  gratitude_items: ['', '', ''],
  affirmations: [],
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      draft: emptyDraft,
      entryId: null,
      isSaving: false,

      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set(s => ({ currentStep: Math.min(s.currentStep + 1, 15) })),
      prevStep: () => set(s => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
      updateDraft: (fields) => set(s => ({ draft: { ...s.draft, ...fields } })),
      setEntryId: (id) => set({ entryId: id }),
      resetDraft: () => set({ currentStep: 1, draft: emptyDraft, entryId: null }),
    }),
    {
      name: 'mindbloom-journal-draft',
      partialize: (s) => ({ currentStep: s.currentStep, draft: s.draft, entryId: s.entryId }),
    }
  )
)
*/
