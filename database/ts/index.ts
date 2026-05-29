// ============================================================
// MindBloom — Supabase Edge Functions
// File: supabase/functions/
// Deploy: supabase functions deploy <name>
// ============================================================

// ────────────────────────────────────────────────────────────────────────────
// FILE: supabase/functions/process-journal/index.ts
// Triggered: Supabase Realtime on journal_entries INSERT/UPDATE (is_draft=FALSE)
// Actions: Generate embedding, emotion analysis, AI insights, memory extraction
// ────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })

// ── System prompt for Emotional Intelligence analysis ────────────────────────
const EI_SYSTEM_PROMPT = `Kamu adalah sistem analisis kecerdasan emosional untuk aplikasi kesehatan mental.
Analisis teks jurnal pengguna dan kembalikan JSON dengan format TEPAT berikut (tanpa markdown, tanpa komentar):
{
  "stress_score": 0.0-1.0,
  "anxiety_score": 0.0-1.0,
  "gratitude_score": 0.0-1.0,
  "burnout_score": 0.0-1.0,
  "optimism_score": 0.0-1.0,
  "overthinking_score": 0.0-1.0,
  "self_compassion_score": 0.0-1.0,
  "dominant_emotion": "string dalam bahasa Indonesia",
  "one_line_summary": "1 kalimat bahasa Indonesia yang hangat dan personal",
  "insight_text": "2-4 kalimat insight yang empatik dan tidak menghakimi",
  "recommended_activity": "1 aktivitas konkret yang relevan",
  "is_low_confidence": false
}`

const MEMORY_SYSTEM_PROMPT = `Ekstrak fakta penting tentang pengguna dari jurnal ini.
Kembalikan JSON array (TEPAT, tanpa markdown):
[
  {
    "memory_type": "fact|pattern|preference|trigger",
    "content": "Fakta singkat dalam bahasa Indonesia",
    "confidence": 0.0-1.0
  }
]
Hanya ekstrak fakta yang jelas dan signifikan. Maksimal 3 item. Jika tidak ada, kembalikan [].`

serve(async (req) => {
  try {
    const { record: entry, old_record } = await req.json()

    // Skip drafts and re-processes
    if (!entry || entry.is_draft) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    // Build content string for embedding
    const content = [
      entry.main_story,
      entry.recurring_thoughts,
      entry.stress_source,
      entry.happy_moments,
      entry.lessons_learned,
      entry.did_well,
      entry.self_compassion,
    ].filter(Boolean).join('\n\n')

    if (!content || content.trim().length < 50) {
      return new Response(JSON.stringify({ skipped: 'content_too_short' }), { status: 200 })
    }

    // Check if content changed (avoid re-processing unchanged entries)
    const contentHash = await crypto.subtle.digest(
      'SHA-256', new TextEncoder().encode(content)
    ).then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''))

    const { data: existingEmb } = await supabase
      .from('journal_embeddings')
      .select('content_hash')
      .eq('entry_id', entry.id)
      .single()

    if (existingEmb?.content_hash === contentHash) {
      return new Response(JSON.stringify({ skipped: 'no_change' }), { status: 200 })
    }

    // ── 1. Generate embedding ─────────────────────────────────────────────
    const embResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content.substring(0, 8000), // token safety
    })
    const embedding = embResponse.data[0].embedding

    await supabase.from('journal_embeddings').upsert({
      entry_id: entry.id,
      user_id: entry.user_id,
      embedding,
      model_used: 'text-embedding-3-small',
      content_hash: contentHash,
    }, { onConflict: 'entry_id' })

    // ── 2. Emotional Intelligence analysis ───────────────────────────────
    const startMs = Date.now()
    const eiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: 'system', content: EI_SYSTEM_PROMPT },
        { role: 'user', content: `Jurnal (${new Date(entry.entry_date).toLocaleDateString('id-ID')}):\n${content}` },
      ],
    })

    const eiText = eiResponse.choices[0].message.content || '{}'
    let eiData: any = {}
    try { eiData = JSON.parse(eiText) } catch { eiData = {} }

    await supabase.from('emotion_analysis').upsert({
      entry_id: entry.id,
      user_id: entry.user_id,
      stress_score: eiData.stress_score,
      anxiety_score: eiData.anxiety_score,
      gratitude_score: eiData.gratitude_score,
      burnout_score: eiData.burnout_score,
      optimism_score: eiData.optimism_score,
      overthinking_score: eiData.overthinking_score,
      self_compassion_score: eiData.self_compassion_score,
      dominant_emotion: eiData.dominant_emotion,
      one_line_summary: eiData.one_line_summary,
      insight_text: eiData.insight_text,
      recommended_activity: eiData.recommended_activity,
      is_low_confidence: eiData.is_low_confidence || false,
      model_used: 'gpt-4o-mini',
      prompt_version: 'v1',
      tokens_used: eiResponse.usage?.total_tokens,
      processing_ms: Date.now() - startMs,
    }, { onConflict: 'entry_id' })

    // ── 3. Generate daily AI insight ─────────────────────────────────────
    if (eiData.insight_text) {
      await supabase.from('ai_insights').upsert({
        user_id: entry.user_id,
        period: 'daily',
        period_start: entry.entry_date,
        period_end: entry.entry_date,
        title: eiData.one_line_summary || 'Insight Hari Ini',
        body: eiData.insight_text,
        category: eiData.stress_score > 0.6 ? 'warning' : 'encouragement',
        emoji: eiData.stress_score > 0.6 ? '⚠️' : '✨',
        stat_value: eiData.dominant_emotion,
        stat_label: 'Emosi Dominan',
        action_label: eiData.recommended_activity ? 'Coba Sekarang' : null,
        model_used: 'gpt-4o-mini',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'user_id,period,period_start,category' })
    }

    // ── 4. Memory extraction (async, non-blocking) ────────────────────────
    // Only run every 3rd journal to save costs
    const { data: countData } = await supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', entry.user_id)
      .eq('is_draft', false)

    const totalEntries = countData as unknown as number
    if (totalEntries % 3 === 0) {
      const memResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 300,
        messages: [
          { role: 'system', content: MEMORY_SYSTEM_PROMPT },
          { role: 'user', content: content.substring(0, 3000) },
        ],
      })

      try {
        const memories: any[] = JSON.parse(memResponse.choices[0].message.content || '[]')
        for (const mem of memories.slice(0, 3)) {
          if (mem.content && mem.memory_type && mem.confidence > 0.6) {
            // Generate embedding for memory
            const memEmb = await openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: mem.content,
            })
            await supabase.from('ai_user_memory').insert({
              user_id: entry.user_id,
              memory_type: mem.memory_type,
              content: mem.content,
              source_type: 'journal',
              source_id: entry.id,
              confidence: mem.confidence,
              embedding: memEmb.data[0].embedding,
            })
          }
        }
      } catch { /* silently skip memory extraction errors */ }
    }

    return new Response(JSON.stringify({ success: true, entry_id: entry.id }), { status: 200 })
  } catch (error) {
    console.error('process-journal error:', error)
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})


// ────────────────────────────────────────────────────────────────────────────
// FILE: supabase/functions/ai-coach/index.ts
// Triggered: POST /functions/v1/ai-coach
// Action: Streaming AI Coach conversation with context assembly
// ────────────────────────────────────────────────────────────────────────────

/*
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })

const BLOOM_SYSTEM_PROMPT = `Kamu adalah Bloom, AI Reflection Coach dari MindBloom — aplikasi journaling untuk kesehatan mental.

Kepribadianmu:
- Hangat, empatik, dan penuh perhatian
- Tidak pernah menghakimi atau memberikan label
- Reflektif — mengajukan pertanyaan yang mendorong penemuan diri
- Tidak memberikan saran medis atau diagnosis klinis
- Selalu mengakui perasaan pengguna sebelum merespons
- Menggunakan bahasa Indonesia yang natural dan hangat
- Panggil pengguna dengan nama mereka jika tersedia

Prinsip percakapan:
1. Validasi perasaan terlebih dahulu
2. Ajukan SATU pertanyaan reflektif yang terbuka
3. Jika ada tanda distress tinggi, sarankan profesional dengan lembut
4. Akhiri respons dengan tanda harapan atau kekuatan

KONTEKS PENGGUNA:
{{user_context}}

JURNAL HARI INI:
{{journal_context}}

MEMORI RELEVAN:
{{memory_context}}`

serve(async (req) => {
  const { session_id, message, user_id } = await req.json()

  // Rate limit check (free: 3 sessions/day)
  const canUse = await supabase.rpc('check_feature', { p_user_id: user_id, p_slug: 'ai_coach' })
  if (!canUse.data) return new Response(JSON.stringify({ error: 'upgrade_required' }), { status: 403 })

  // Assemble context
  const [profile, todayJournal, memories, history] = await Promise.all([
    supabase.from('profiles').select('display_name, plan').eq('id', user_id).single(),
    supabase.from('journal_entries').select('*')
      .eq('user_id', user_id).eq('entry_date', new Date().toISOString().split('T')[0])
      .eq('is_draft', false).single(),
    supabase.from('ai_user_memory').select('memory_type, content')
      .eq('user_id', user_id).eq('is_active', true)
      .order('reference_count', { ascending: false }).limit(5),
    supabase.from('coach_messages').select('role, content')
      .eq('session_id', session_id).order('sequence_no').limit(10),
  ])

  const systemPrompt = BLOOM_SYSTEM_PROMPT
    .replace('{{user_context}}', `Nama: ${profile.data?.display_name || 'Pengguna'}, Plan: ${profile.data?.plan}`)
    .replace('{{journal_context}}', todayJournal.data?.main_story?.substring(0, 500) || 'Belum ada jurnal hari ini')
    .replace('{{memory_context}}', memories.data?.map(m => `- ${m.content}`).join('\n') || 'Tidak ada memori tersimpan')

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history.data || []).map(m => ({ role: m.role as any, content: m.content })),
    { role: 'user', content: message },
  ]

  // Save user message
  const { data: session } = await supabase.from('coach_sessions').select('total_messages').eq('id', session_id).single()
  await supabase.from('coach_messages').insert({
    session_id, user_id, role: 'user', content: message,
    sequence_no: (session?.total_messages || 0) + 1,
  })

  // Stream AI response
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o', stream: true, max_tokens: 500, temperature: 0.8, messages,
  })

  let fullResponse = ''
  let totalTokens = 0

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || ''
        fullResponse += delta
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
      }
      // Save assistant message
      await supabase.from('coach_messages').insert({
        session_id, user_id, role: 'assistant', content: fullResponse,
        sequence_no: (session?.total_messages || 0) + 2,
      })
      await supabase.from('coach_sessions').update({ total_messages: (session?.total_messages || 0) + 2 })
        .eq('id', session_id)
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
})
*/


// ────────────────────────────────────────────────────────────────────────────
// FILE: supabase/functions/midtrans-webhook/index.ts
// Triggered: POST from Midtrans payment gateway
// Action: Update subscription and payment_transaction status
// ────────────────────────────────────────────────────────────────────────────

/*
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY')!

serve(async (req) => {
  const body = await req.json()

  // Verify Midtrans signature
  const signatureKey = createHash('sha512')
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${MIDTRANS_SERVER_KEY}`)
    .digest('hex')
  if (signatureKey !== body.signature_key) {
    return new Response('Invalid signature', { status: 401 })
  }

  const { order_id, transaction_status, payment_type, fraud_status } = body
  const isSuccess = transaction_status === 'settlement' ||
    (transaction_status === 'capture' && fraud_status === 'accept')

  // Update payment transaction
  await supabase.from('payment_transactions').update({
    status: isSuccess ? 'success' : transaction_status === 'expire' ? 'expired' : 'failed',
    midtrans_txn_id: body.transaction_id,
    payment_type,
    paid_at: isSuccess ? new Date().toISOString() : null,
    gateway_payload: body,
    updated_at: new Date().toISOString(),
  }).eq('midtrans_order_id', order_id)

  // Activate subscription on success
  if (isSuccess) {
    const { data: txn } = await supabase
      .from('payment_transactions')
      .select('user_id, subscription_id')
      .eq('midtrans_order_id', order_id)
      .single()

    if (txn?.subscription_id) {
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await supabase.from('subscriptions').update({
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', txn.subscription_id)
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
*/


// ────────────────────────────────────────────────────────────────────────────
// FILE: supabase/functions/send-notifications/index.ts
// Triggered: pg_cron daily 13:00 UTC (20:00 WIB)
// Action: Send push notifications via FCM for streak reminders
// ────────────────────────────────────────────────────────────────────────────

/*
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!

serve(async (req) => {
  // Queue reminders via DB function
  const { data: queuedCount } = await supabase.rpc('queue_streak_reminders')

  // Fetch unsent push notifications due now
  const { data: notifications } = await supabase
    .from('notification_queue')
    .select('id, user_id, title, body, data, device_id')
    .eq('channel', 'push')
    .is('sent_at', null)
    .is('failed_at', null)
    .lte('scheduled_at', new Date().toISOString())
    .limit(100)

  if (!notifications?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 })

  // Get push tokens for devices
  const deviceIds = notifications.map(n => n.device_id).filter(Boolean)
  const { data: devices } = await supabase
    .from('user_devices')
    .select('id, push_token, platform')
    .in('id', deviceIds)
    .not('push_token', 'is', null)

  const tokenMap = Object.fromEntries(devices?.map(d => [d.id, d]) || [])
  let sent = 0

  for (const notif of notifications) {
    const device = tokenMap[notif.device_id]
    if (!device?.push_token) continue

    try {
      const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: { 'Authorization': `key=${FCM_SERVER_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: device.push_token,
          notification: { title: notif.title, body: notif.body },
          data: notif.data,
        }),
      })

      if (fcmRes.ok) {
        await supabase.from('notification_queue').update({ sent_at: new Date().toISOString() }).eq('id', notif.id)
        sent++
      }
    } catch (e) {
      await supabase.from('notification_queue').update({
        failed_at: new Date().toISOString(),
        failure_reason: String(e),
        retry_count: 1,
      }).eq('id', notif.id)
    }
  }

  return new Response(JSON.stringify({ sent, queued: queuedCount }), { status: 200 })
})
*/
