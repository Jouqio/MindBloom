const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, LevelFormat, TabStopType, PageBreak, SimpleField
} = require('docx');
const fs = require('fs');

const C = {
  indigo:'5B4FE8', violet:'7C6EF5', pink:'FF7B8A', green:'1DB97A',
  amber:'F0A500', red:'E85B5B', teal:'0D9488', blue:'2563EB',
  slate:'475569', dark:'0F172A', white:'FFFFFF', nearW:'FAFAFA',
  lightI:'EEF0FE', lightG:'ECFDF5', lightA:'FFFBEB', gray:'F3F4F6',
  code:'1E293B', mid:'94A3B8', coral:'D85A30',
};

const b1={style:BorderStyle.SINGLE,size:1,color:'E2E8F0'};
const borders={top:b1,bottom:b1,left:b1,right:b1};
const sp=(n=1)=>Array.from({length:n},()=>new Paragraph({children:[new TextRun('')],spacing:{before:0,after:0}}));
const PB=()=>new Paragraph({children:[new PageBreak()]});

function hr(color=C.indigo){
  return new Paragraph({spacing:{before:160,after:160},border:{bottom:{style:BorderStyle.SINGLE,size:4,color,space:1}},children:[new TextRun('')]});
}
function H(text,level=HeadingLevel.HEADING_2,color=C.indigo){
  const sz={[HeadingLevel.HEADING_1]:44,[HeadingLevel.HEADING_2]:30,[HeadingLevel.HEADING_3]:24,[HeadingLevel.HEADING_4]:22};
  const sp2={[HeadingLevel.HEADING_1]:480,[HeadingLevel.HEADING_2]:280,[HeadingLevel.HEADING_3]:180,[HeadingLevel.HEADING_4]:140};
  return new Paragraph({heading:level,spacing:{before:sp2[level]||140,after:80},children:[new TextRun({text,bold:true,color,font:'Arial',size:sz[level]||22})]});
}
function P(text,opts={}){
  return new Paragraph({spacing:{before:opts.before||60,after:opts.after||60},indent:opts.indent?{left:opts.indent}:undefined,children:[new TextRun({text,font:'Arial',size:opts.size||21,bold:opts.bold||false,italic:opts.italic||false,color:opts.color||C.slate})]});
}
function B(text){return new Paragraph({numbering:{reference:'bullets',level:0},spacing:{before:30,after:30},children:[new TextRun({text,font:'Arial',size:21,color:C.slate})]});}
function N(text){return new Paragraph({numbering:{reference:'numbers',level:0},spacing:{before:30,after:30},children:[new TextRun({text,font:'Arial',size:21,color:C.slate})]});}
function code(lines){
  const arr=Array.isArray(lines)?lines:[lines];
  return arr.map(l=>new Paragraph({spacing:{before:12,after:12},indent:{left:360},shading:{type:ShadingType.CLEAR,fill:'F1F5F9'},children:[new TextRun({text:l,font:'Courier New',size:17,color:C.code})]}));
}
function callout(text,fill=C.lightI,borderColor=C.indigo){
  return new Paragraph({spacing:{before:120,after:120},border:{left:{style:BorderStyle.SINGLE,size:14,color:borderColor,space:1}},indent:{left:320,right:240},shading:{type:ShadingType.CLEAR,fill},children:[new TextRun({text,font:'Arial',size:21,color:C.dark,italic:true})]});
}
function secHead(emoji,title,color=C.indigo){
  return new Paragraph({spacing:{before:560,after:160},children:[new TextRun({text:`${emoji}  ${title}`,font:'Arial',size:52,bold:true,color})]});
}
function T(headers,rows,widths,hFill=C.indigo){
  const total=widths.reduce((a,b)=>a+b,0);
  return new Table({
    width:{size:total,type:WidthType.DXA},columnWidths:widths,
    rows:[
      new TableRow({children:headers.map((h,i)=>new TableCell({borders,shading:{type:ShadingType.CLEAR,fill:hFill},width:{size:widths[i],type:WidthType.DXA},margins:{top:80,bottom:80,left:120,right:120},children:[new Paragraph({children:[new TextRun({text:h,font:'Arial',size:19,bold:true,color:C.white})]})]})) }),
      ...rows.map((r,ri)=>new TableRow({children:r.map((c,ci)=>new TableCell({borders,shading:{type:ShadingType.CLEAR,fill:ri%2===0?C.white:C.nearW},width:{size:widths[ci],type:WidthType.DXA},margins:{top:70,bottom:70,left:110,right:110},verticalAlign:VerticalAlign.TOP,children:[new Paragraph({children:[new TextRun({text:String(c.text||c),font:c.mono?'Courier New':'Arial',size:c.mono?17:19,bold:c.bold||false,color:c.color||C.dark,italic:c.italic||false})]})]}))  }))
    ]
  });
}
function inlineCode(text){return new TextRun({text,font:'Courier New',size:18,color:C.code,shading:{type:ShadingType.CLEAR,fill:'F1F5F9'}});}

// ─── COVER ───────────────────────────────────────────────────
const cover=[
  ...sp(5),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:80},children:[new TextRun({text:'🧠',font:'Arial',size:120})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:120},children:[new TextRun({text:'MindBloom',font:'Arial',size:96,bold:true,color:C.indigo})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:80},children:[new TextRun({text:'AI Brain — Technical Architecture',font:'Arial',size:44,color:C.violet})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:60},children:[new TextRun({text:'OpenAI · LangChain · RAG · Embeddings · pgvector · Long-term Memory',font:'Arial',size:26,italic:true,color:C.slate})]}),
  ...sp(2),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:20},children:[
    new TextRun({text:'  Reflection Coach  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.indigo}}),
    new TextRun({text:'   '}),
    new TextRun({text:'  EI Engine  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.teal}}),
    new TextRun({text:'   '}),
    new TextRun({text:'  Insight Generator  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.violet}}),
  ]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:8,after:0},children:[
    new TextRun({text:'  Memory Vault  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.amber}}),
    new TextRun({text:'   '}),
    new TextRun({text:'  RAG System  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.green}}),
    new TextRun({text:'   '}),
    new TextRun({text:'  Personalization  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.slate}}),
  ]}),
  ...sp(3),
  new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'v1.0  ·  May 2025  ·  Confidential',font:'Arial',size:22,italic:true,color:C.slate})]}),
  ...sp(2),PB(),
];

// ─── S1 AI ARCHITECTURE ──────────────────────────────────────
const s1=[
  secHead('🏗️','SECTION 1 — AI ARCHITECTURE OVERVIEW'),
  hr(),
  H('1.1  System Map',HeadingLevel.HEADING_2),
  callout('MindBloom AI bukan satu model tunggal — melainkan 6 sistem AI yang beroperasi independen namun saling berbagi konteks melalui shared memory layer di PostgreSQL + pgvector.'),
  ...sp(1),
  T(['System','Model','Trigger','Latency','Cost/Call'],
    [
      ['Reflection Coach',   'GPT-4o streaming',         'User opens coach tab / post-journal', '< 2s first token', '~$0.02/session'],
      ['EI Engine',          'GPT-4o-mini (JSON)',        'Async after journal save',             '< 5s',             '~$0.001/entry'],
      ['Insight Generator',  'GPT-4o-mini (JSON)',        'After EI + daily/weekly/monthly cron', '< 3s',             '~$0.001/batch'],
      ['Memory Extractor',   'GPT-4o-mini (JSON)',        'Every 3rd journal (async)',            '< 4s',             '~$0.002/run'],
      ['Monthly Book Gen.',  'GPT-4o (long form)',        'pg_cron 03:00 UTC day 1',             '< 30s',            '~$0.05/book'],
      ['Recommendation Eng.','GPT-4o-mini + rule-based', 'Weekly cron + real-time rules',       '< 3s',             '~$0.002/week'],
      ['Embedding Pipeline', 'text-embedding-3-small',   'After journal save + memory extract', '< 1s',             '~$0.00002/call'],
      ['Personalization Eng.','No LLM (rule-based)',      'On every coach session open',          '< 100ms',          '$0 (SQL only)'],
    ],
    [1400,1800,2200,1300,2660],C.indigo),
  ...sp(1),
  H('1.2  Technology Stack',HeadingLevel.HEADING_2),
  T(['Layer','Technology','Version','Purpose'],
    [
      ['AI Model — Coach',     'OpenAI GPT-4o',            '2024-11', 'Streaming conversation, empathetic coaching'],
      ['AI Model — Analysis',  'OpenAI GPT-4o-mini',       '2024-07', 'EI scoring, memory extraction, insights (10x cheaper)'],
      ['Embeddings',           'text-embedding-3-small',   'v1',      '1536-dim vectors, 5x cheaper than ada-002'],
      ['Vector DB',            'pgvector (Supabase)',       '0.7+',    'IVFFlat index, cosine similarity search'],
      ['Orchestration',        'TypeScript (no LangChain needed)', 'custom', 'Direct OpenAI SDK calls, simpler and faster than LangChain for this use case'],
      ['LangChain (optional)', 'LangChain.js',             '0.3+',    'Only needed if adding agent tools or complex chains in v2'],
      ['Caching',              'PostgreSQL content_hash',  'n/a',     'Skip re-embedding unchanged content'],
      ['Edge Runtime',         'Supabase Edge Functions',  'Deno',    'Async processing, webhook handlers'],
      ['Background Jobs',      'Supabase pg_cron',         'built-in','Scheduled: analytics refresh, memory books, notifications'],
    ],
    [1600,1800,900,5060],C.slate),
  ...sp(1),PB(),
];

// ─── S2 DATA FLOW ─────────────────────────────────────────────
const s2=[
  secHead('🔄','SECTION 2 — DATA FLOW ARCHITECTURE'),
  hr(),
  H('2.1  Journal Save → AI Pipeline',HeadingLevel.HEADING_2),
  callout('Seluruh AI processing berjalan ASYNC setelah journal tersimpan. Pengguna tidak perlu menunggu — UI langsung menampilkan success state, AI bekerja di background.'),
  T(['Step','Action','Actor','DB Write','Duration'],
    [
      ['1','User submits journal form (step 15)',         'Client',           'journal_entries INSERT',              '< 200ms (API call)'],
      ['2','Supabase Realtime broadcasts change',         'Supabase Realtime','—',                                   '< 50ms'],
      ['3','process-journal Edge Function triggered',     'Edge Function',    '—',                                   '< 100ms startup'],
      ['4','Content hash check (skip if unchanged)',      'Edge Function',    '—',                                   '< 50ms'],
      ['5','text-embedding-3-small called',               'OpenAI API',       'journal_embeddings UPSERT',           '< 500ms'],
      ['6','GPT-4o-mini EI analysis',                     'OpenAI API',       'emotion_analysis UPSERT',             '1–3s'],
      ['7','Daily insight generated from EI scores',      'Edge Function',    'ai_insights UPSERT',                  '< 200ms (SQL)'],
      ['8','Action rules evaluated (stress/burnout)',      'Edge Function',    'notification_queue INSERT if triggered','< 100ms'],
      ['9','Memory extraction (every 3rd journal)',        'OpenAI API',       'ai_user_memory INSERT',               '2–4s'],
      ['10','Supabase Realtime notifies client',           'Supabase Realtime','—',                                   '< 100ms'],
      ['11','Dashboard AI insight widget updates',         'Client',           '—',                                   'Auto via subscription'],
    ],
    [400,2400,1600,2000,2960],C.teal),
  ...sp(1),
  H('2.2  AI Coach Context Assembly',HeadingLevel.HEADING_2),
  callout('Context assembly menggunakan Promise.all() — semua 5 sumber data di-fetch paralel untuk meminimalkan latency. Target: context siap dalam < 800ms.'),
  T(['Source','Data fetched','Method','Token budget','Priority'],
    [
      ['Today\'s journal',   'Full entry + EI scores',         'SELECT by user_id + today\'s date',              '~800 tokens','1 — Always included'],
      ['Long-term memories', 'Top-5 relevant memories',         'pgvector cosine similarity on ai_user_memory',   '~400 tokens','2 — If memories exist'],
      ['Similar journals',   'Top-3 entries from past',         'pgvector cosine similarity on journal_embeddings','~600 tokens','3 — For pattern recognition'],
      ['Chat history',       'Last 10 messages in session',     'SELECT by session_id ORDER BY sequence_no',      '~500 tokens','4 — Conversation continuity'],
      ['User profile',       'name, plan, days_active, prefs',  'SELECT profiles + user_preferences',             '~200 tokens','5 — Personalization'],
      ['Base persona',       'BLOOM_PERSONA constant',          'Hardcoded in Edge Function',                     '~300 tokens','0 — Always first'],
      ['TOTAL context',      '—',                               '—',                                              '~2800 tokens','Max: 3500 tokens'],
    ],
    [1600,1800,2200,1100,2660],C.violet),
  ...sp(1),PB(),
];

// ─── S3 PROMPT ARCHITECTURE ──────────────────────────────────
const s3=[
  secHead('💬','SECTION 3 — PROMPT ARCHITECTURE'),
  hr(),
  H('3.1  4-Layer System',HeadingLevel.HEADING_2),
  T(['Layer','Name','Stability','Content','Token budget'],
    [
      ['Layer 0','Base persona (BLOOM_PERSONA)',    'Never changes',      'Kepribadian, prinsip, larangan keras Bloom','~300 tokens'],
      ['Layer 1','User context',                    'Changes per user',   'Nama, tujuan, pola emosi, preferences',     '~200 tokens'],
      ['Layer 2','Session context (RAG)',            'Changes per session','Jurnal hari ini, memories, similar journals','~1900 tokens'],
      ['Layer 3','Task instruction',                'Changes per request','Specific task: questioning, insight, recommend','~100 tokens'],
    ],
    [700,2200,1400,2200,2860],C.indigo),
  ...sp(1),
  H('3.2  Prompt Version Control',HeadingLevel.HEADING_2),
  callout('Setiap prompt memiliki version string (mis: "v1.2") yang disimpan ke database. Ini memungkinkan A/B testing dan rollback jika prompt baru menurunkan kualitas.'),
  T(['Field','Table','Purpose'],
    [
      ['system_prompt_v','coach_sessions','Track versi prompt yang digunakan saat sesi coach'],
      ['prompt_version', 'emotion_analysis','Track versi EI prompt untuk reproducibility'],
      ['model_used',     'coach_sessions + emotion_analysis + ai_insights','Track model version untuk audit'],
    ],
    [1600,2000,5760],C.slate),
  ...sp(1),
  H('3.3  Key Prompt Templates',HeadingLevel.HEADING_2),
  P('BLOOM_PERSONA (Layer 0) — excerpt:', {bold:true, color:C.indigo}),
  ...code([
    'Kamu adalah Bloom, AI Reflection Coach dari MindBloom.',
    '',
    'PRINSIP PERCAKAPAN (urutan ketat):',
    '1. Validasi emosi pengguna dengan empati',
    '2. Ajukan SATU pertanyaan reflektif terbuka',
    '3. Jika stress_score > 0.8: sarankan profesional secara lembut',
    '4. Akhiri dengan kalimat kekuatan atau harapan',
    '',
    'LARANGAN KERAS:',
    '- Jangan berikan diagnosis atau label psikologis',
    '- Jangan gunakan "kamu harus..." atau "seharusnya..."',
    '- Jangan stack multiple pertanyaan dalam 1 respons',
    '- Maksimal 150 kata per respons',
  ]),
  ...sp(1),
  P('EI_ANALYSIS_PROMPT (JSON mode):', {bold:true, color:C.teal}),
  ...code([
    'Analisis teks jurnal. Kembalikan JSON TEPAT (tanpa markdown):',
    '{',
    '  "stress_score": 0.0-1.0,',
    '  "anxiety_score": 0.0-1.0,',
    '  "gratitude_score": 0.0-1.0,',
    '  "burnout_score": 0.0-1.0,',
    '  "optimism_score": 0.0-1.0,',
    '  "overthinking_score": 0.0-1.0,',
    '  "self_compassion_score": 0.0-1.0,',
    '  "dominant_emotion": "satu kata bahasa Indonesia",',
    '  "one_line_summary": "1 kalimat hangat dan personal",',
    '  "insight_text": "2-4 kalimat insight empatik",',
    '  "recommended_activity": "1 aktivitas konkret",',
    '  "is_low_confidence": false',
    '}',
  ]),
  ...sp(1),PB(),
];

// ─── S4 REFLECTION COACH ─────────────────────────────────────
const s4=[
  secHead('🤖','SECTION 4 — REFLECTION COACH FLOW'),
  hr(),
  H('4.1  Conversation Flow',HeadingLevel.HEADING_2),
  T(['Phase','Action','Model','Notes'],
    [
      ['1. Open session',     'Check rate limit → create coach_sessions row',              'SQL only',       'Free: 3/day, Premium: unlimited'],
      ['2. Context assemble', 'Promise.all: journal + memories + similar + history + profile','pgvector + SQL','Target < 800ms total'],
      ['3. Build prompt',     'Concatenate 4 layers → ~2800 tokens system prompt',          'String concat',  'Include EI stress score for tone adjustment'],
      ['4. Stream GPT-4o',    'openai.chat.completions.create({stream:true})',              'GPT-4o',         'SSE → client bubble animation'],
      ['5. Save messages',    'INSERT coach_messages for user + assistant turn',            'SQL',            'sequence_no for ordering'],
      ['6. Update costs',     'tokens_input + tokens_output + cost_usd calculation',       'SQL UPDATE',     'For cost monitoring dashboard'],
      ['7. Update memories',  'Increment reference_count for used memories',               'SQL UPDATE',     'Improves retrieval ranking'],
    ],
    [1000,2400,1400,4560],C.indigo),
  ...sp(1),
  H('4.2  Reflection Question Bank',HeadingLevel.HEADING_2),
  callout('Bloom tidak memilih pertanyaan dari bank secara random — pertanyaan dihasilkan dinamis oleh GPT-4o berdasarkan context. Bank ini digunakan sebagai few-shot examples dalam prompt untuk menunjukkan style yang diinginkan.'),
  T(['Category','Example question','When to use'],
    [
      ['Explore feelings',    '"Apa yang paling membuatmu merasa seperti itu hari ini?"',      'Semua situasi, terutama entry pertama'],
      ['Pattern recognition', '"Aku perhatikan ini sudah beberapa kali muncul. Apa yang kamu sadari?"', 'Saat similar journals ditemukan via RAG'],
      ['Reframing',           '"Bagaimana jika kita lihat dari sudut yang berbeda?"',           'Saat anxiety_score atau overthinking > 0.6'],
      ['Grounding',           '"Apa yang bisa kamu kontrol dari situasi ini sekarang?"',        'Saat overthinking_score > 0.7'],
      ['Self-compassion',     '"Apa yang akan kamu katakan ke sahabatmu yang mengalami ini?"', 'Saat self_compassion_score < 0.3'],
      ['Micro-action',        '"Langkah kecil apa yang paling mungkin kamu lakukan besok?"',   'Sebagai penutup sesi'],
      ['Strength-based',      '"Kamu sudah melewati hal berat sebelumnya. Apa yang membantumu saat itu?"', 'Saat burnout_score > 0.7'],
    ],
    [1400,2800,5160],C.teal),
  ...sp(1),PB(),
];

// ─── S5 EI ENGINE ─────────────────────────────────────────────
const s5=[
  secHead('🧠','SECTION 5 — EMOTIONAL INTELLIGENCE ENGINE'),
  hr(),
  H('5.1  7 Dimension Scoring',HeadingLevel.HEADING_2),
  T(['Dimension','Score range','Detection signals','Action threshold'],
    [
      ['stress_score',         '0.0–1.0','Keluhan beban, deadline, konflik, kata: "kewalahan", "capek", "berat"',       '> 0.8 → queue breathing recommendation'],
      ['anxiety_score',        '0.0–1.0','Kekhawatiran masa depan, "bagaimana jika", ketidakpastian, rumination',       '> 0.7 → suggest grounding question'],
      ['gratitude_score',      '0.0–1.0','Ekspresi syukur, apresiasi, "bersyukur", "senang karena"',                    '> 0.75 → save memory: gratitude strength'],
      ['burnout_score',        '0.0–1.0','Kelelahan emosional + fisik, "tidak ada energi", "tidak peduli lagi"',        '> 0.7 → gentle reminder next day push notif'],
      ['optimism_score',       '0.0–1.0','Orientasi masa depan positif, rencana, harapan, "akan mencoba"',              '> 0.7 → use more challenging coach questions'],
      ['overthinking_score',   '0.0–1.0','Pikiran berputar, hyperanalysis, repetisi topik, pertanyaan tanpa jawaban',   '> 0.7 → grounding & acceptance questions'],
      ['self_compassion_score','0.0–1.0','Kebaikan pada diri, self-forgiveness, "wajar untuk merasa begini"',           '< 0.3 → trigger self-compassion reflection prompt'],
    ],
    [1700,900,3200,3560],C.violet),
  ...sp(1),
  H('5.2  Model Configuration',HeadingLevel.HEADING_2),
  T(['Parameter','Value','Rationale'],
    [
      ['Model',          'GPT-4o-mini',  'Sufficient accuracy for 0.0–1.0 scoring, 10x cheaper than GPT-4o'],
      ['Temperature',    '0.2',          'Low randomness ensures consistent scoring between similar inputs'],
      ['Max tokens',     '700',          'Enough for full JSON output with all 12 fields'],
      ['JSON mode',      'response_format: { type: "text" } + explicit JSON instruction', 'Strict JSON parsing, no markdown fences'],
      ['Prompt version', 'Tracked in DB', 'Enables A/B testing and rollback if quality degrades'],
      ['Retry logic',    '2 retries with exponential backoff', 'OpenAI API occasionally times out'],
      ['Content limit',  '4000 tokens input', 'Truncate journal content to stay within context window'],
    ],
    [1600,2000,5760],C.slate),
  ...sp(1),
  H('5.3  Quality Safeguards',HeadingLevel.HEADING_2),
  B('is_low_confidence flag: set TRUE jika journal terlalu pendek (<100 chars) atau ambiguous.'),
  B('needs_review flag: set TRUE jika ada kombinasi burnout > 0.8 + optimism < 0.2 (distress signal).'),
  B('Score clamping: semua scores di-clamp ke [0.0, 1.0] sebelum insert ke DB.'),
  B('Parse error fallback: jika JSON parse gagal, insert dengan scores null dan is_low_confidence = TRUE.'),
  B('Tidak ada PII yang dikirim ke OpenAI: nama, email, dan identifiable info distrip sebelum API call.'),
  ...sp(1),PB(),
];

// ─── S6 RAG & MEMORY ──────────────────────────────────────────
const s6=[
  secHead('🗄️','SECTION 6 — RAG SYSTEM & LONG-TERM MEMORY'),
  hr(),
  H('6.1  Embedding Architecture',HeadingLevel.HEADING_2),
  T(['Table','Content embedded','Model','Index type','Search method'],
    [
      ['journal_embeddings','main_story + recurring_thoughts + happy_moments + lessons_learned','text-embedding-3-small 1536-dim','IVFFlat lists=100','search_journals_semantic() RPC'],
      ['coach_messages',    'Each message content (role:assistant + user)',                    'text-embedding-3-small 1536-dim','IVFFlat lists=50', 'Direct SQL with <=> operator'],
      ['ai_user_memory',    'Each extracted fact/pattern/preference',                          'text-embedding-3-small 1536-dim','IVFFlat lists=50', 'retrieveRelevantMemories() function'],
    ],
    [1800,2400,1800,1400,2960],C.green),
  ...sp(1),
  H('6.2  Memory Lifecycle',HeadingLevel.HEADING_2),
  T(['Stage','When','Action','Quality gate'],
    [
      ['Extraction',  'Every 3rd journal (totalEntries % 3 === 0)',  'GPT-4o-mini extracts max 3 facts → INSERT ai_user_memory + embedding', 'confidence > 0.6, no near-duplicate'],
      ['Activation',  'On insert',                                    'is_active = TRUE, reference_count = 0',                               'Auto'],
      ['Usage',       'Every coach session',                          'Retrieved via cosine similarity, reference_count++, last_referenced updated','similarity > 0.75'],
      ['Deactivation','Monthly prune job',                            'is_active = FALSE if confidence < 0.4 AND last_referenced > 30 days ago','Auto via pg_cron'],
      ['Archive',     'Never deleted',                                'is_active = FALSE records kept for audit trail',                       'Permanent retention'],
    ],
    [1200,2400,2600,3160],C.amber),
  ...sp(1),
  H('6.3  Memory Types with Examples',HeadingLevel.HEADING_2),
  T(['Type','Example content','Source','Use in coach'],
    [
      ['fact',        '"Asmawati adalah seorang guru SMA dengan dua anak"',         'Explicit journal mention', 'Bloom menyebut konteks: "Dengan beban mengajar dan dua anak di rumah..."'],
      ['pattern',     '"Sering merasa cemas dan kewalahan setiap Senin pagi"',      'Pattern dari 3+ journals',  'Bloom anticipates: "Senin memang sering berat ya — ada yang beda minggu ini?"'],
      ['preference',  '"Lebih nyaman menulis jurnal di malam hari"',                'Behavioral inference',      'Bloom references preference in tone/context'],
      ['trigger',     '"Stres meningkat saat deadline mendekat atau anak sakit"',   'EI pattern detection',      'Bloom uses trigger-aware grounding: "Deadline minggu ini terasa beda?"'],
      ['achievement', '"Mencapai streak 30 hari pertama pada Mei 2025"',            'System event',              'Bloom celebrates: "Masih ingat 30 hari berturut-turut bulan lalu?"'],
    ],
    [1200,2600,1600,4960],C.indigo),
  ...sp(1),
  H('6.4  pgvector Query Pattern',HeadingLevel.HEADING_2),
  ...code([
    '-- Semantic search: journals similar to current query',
    'SELECT je.id, je.entry_date,',
    '       1 - (emb.embedding <=> $1::vector) AS similarity,',
    '       LEFT(je.main_story, 200) AS snippet',
    'FROM journal_embeddings emb',
    'JOIN journal_entries je ON je.id = emb.entry_id',
    'WHERE emb.user_id = $2',
    '  AND je.is_deleted = FALSE',
    '  AND 1 - (emb.embedding <=> $1::vector) > 0.75  -- threshold',
    'ORDER BY emb.embedding <=> $1::vector',
    'LIMIT 3;',
    '',
    '-- Memory retrieval with recency + similarity weighting',
    'SELECT memory_type, content, confidence,',
    '       1 - (embedding <=> $1::vector) AS similarity',
    'FROM ai_user_memory',
    'WHERE user_id = $2 AND is_active = TRUE',
    'ORDER BY embedding <=> $1::vector',
    'LIMIT 5;',
  ]),
  ...sp(1),PB(),
];

// ─── S7 INSIGHT ENGINE ───────────────────────────────────────
const s7=[
  secHead('💡','SECTION 7 — INSIGHT ENGINE'),
  hr(),
  H('7.1  4-Tier Temporal Insights',HeadingLevel.HEADING_2),
  T(['Tier','Trigger','Data source','Output count','Model'],
    [
      ['Daily',  'After EI analysis completes (async)',        'emotion_analysis + journal_entries for today vs yesterday', '1–3 insights',  'GPT-4o-mini'],
      ['Weekly', 'pg_cron Sunday 23:00 UTC',                   'mv_weekly_user_stats (last 2 weeks)',                       '2–4 insights',  'GPT-4o-mini'],
      ['Monthly','pg_cron 1st of month 02:30 UTC',             'mv_monthly_user_stats + habit_correlations',               '3–5 insights',  'GPT-4o-mini'],
      ['Yearly', 'pg_cron Jan 1 04:00 UTC',                    'Full year aggregation + annual_reviews',                   '5–8 insights',  'GPT-4o'],
    ],
    [700,1800,2400,1200,4260],C.coral),
  ...sp(1),
  H('7.2  Insight Categories + Trigger Conditions',HeadingLevel.HEADING_2),
  T(['Category','Trigger condition','Stat example','CTA'],
    [
      ['mood_trend',          'avg_mood changes > 10% week-over-week',          '+18% vs minggu lalu',           'Tulis jurnal lagi'],
      ['stress_pattern',      'stress_score > 0.6 for 3+ consecutive days',     'Stres Senin pagi — pola terdeteksi','Latihan pernapasan'],
      ['gratitude',           'gratitude_score > 0.7 OR > 4 items per entry',   '5 item syukur hari ini',        'Tambah kebiasaan syukur'],
      ['habit_correlation',   'correlation_r > 0.4 on any habit-mood pair',     'Olahraga → mood +18%',          'Lihat detail korelasi'],
      ['warning',             'burnout_score > 0.7 OR (stress > 0.8 × 2 days)', 'Tanda kelelahan terdeteksi',    'Buka ruang bernapas'],
      ['encouragement',       'streak milestone OR significant mood improvement','14 hari streak! Luar biasa',    'Lihat taman emosional'],
      ['growth',              'self_compassion_score improved > 0.15 in 2 weeks','Belas kasih diri meningkat',   'Baca refleksi bulan lalu'],
    ],
    [1500,2400,1800,1600,3060],C.teal),
  ...sp(1),PB(),
];

// ─── S8 RECOMMENDATION ENGINE ────────────────────────────────
const s8=[
  secHead('🎯','SECTION 8 — RECOMMENDATION ENGINE'),
  hr(),
  H('8.1  Two-layer Architecture',HeadingLevel.HEADING_2),
  callout('Layer 1: rule-based triggers (zero AI cost, < 100ms). Layer 2: AI-generated weekly recommendations (GPT-4o-mini). Layer 1 runs every journal save; Layer 2 runs once per week via pg_cron.'),
  H('8.2  Rule-based Triggers (Layer 1)',HeadingLevel.HEADING_3,C.green),
  T(['Condition','Action','Delivery'],
    [
      ['stress_score > 0.8',              'Recommend breathing exercise 4-4-4-4',                              'In-app action button in daily insight card'],
      ['burnout_score > 0.7',             'Queue gentle push notification next day; suggest rest day content', 'Push notification +20 hours'],
      ['streak_days in [3,7,14,30,90]',   'Trigger achievement unlock + confetti + streak milestone insight',  'In-app celebration overlay'],
      ['mood_score < 4 for 3 days',       'Suggest life wheel check-in + mood calendar review',               'Dashboard banner'],
      ['habit_correlation_r > 0.4',       'Show "Hari olahraga, mood kamu +18%" insight card',                'Habit tracker widget'],
      ['no_journal_by_20:00',             'Send streak reminder push notification',                            'Push notification via pg_cron 13:00 UTC'],
      ['memory_book is_ready = TRUE',     'Send "📖 Buku Kenangan siap" push notification',                    'Push notification immediately'],
    ],
    [2200,2600,4560],C.green),
  ...sp(1),
  H('8.3  AI Recommendations (Layer 2)',HeadingLevel.HEADING_3,C.violet),
  ...code([
    '// Weekly AI recommendation prompt',
    'const prompt = `',
    'Berdasarkan data minggu ini pengguna:',
    '- Avg mood: ${stats.avg_mood}/10',
    '- Habit correlations: ${correlations.map(c => c.insight_text).join(", ")}',
    '- Emotional patterns: ${patterns.join(", ")}',
    '- Tujuan: ${user.journaling_goal}',
    '',
    'Buat 3 rekomendasi aktivitas personal untuk minggu depan.',
    'Format JSON: [{activity, reason, estimated_impact}]',
    '`;',
  ]),
  ...sp(1),PB(),
];

// ─── S9 MONTHLY BOOK ──────────────────────────────────────────
const s9=[
  secHead('📖','SECTION 9 — MONTHLY REFLECTION BOOK GENERATOR'),
  hr(),
  H('9.1  Generation Pipeline',HeadingLevel.HEADING_2),
  T(['Step','Action','Method','Cost'],
    [
      ['1. Trigger',      'pg_cron 03:00 UTC 1st of month → generate_all_memory_books()',    'PostgreSQL function',     '$0'],
      ['2. Data collect', 'Aggregate: entries, mood heatmap, emotions dist., gratitude counts','Pure SQL aggregation',   '$0'],
      ['3. Highlights',   'Best happy_moments (by mood), top lesson, most mentioned person',  'SQL + window functions',  '$0'],
      ['4. AI narrative', 'highlights JSON → GPT-4o → 3-paragraph personal narrative',       'GPT-4o ~$0.05/book',      '~$0.05'],
      ['5. PDF export',   'memory_book data → Puppeteer → PDF → Supabase Storage',           'Edge Function',           '~$0.002/PDF'],
      ['6. Notify user',  'is_ready = TRUE → push notification: "Buku Kenangan siap!"',      'Realtime + push',         '$0'],
    ],
    [700,2000,2800,2000,2860],C.amber),
  ...sp(1),
  H('9.2  AI Narrative Prompt',HeadingLevel.HEADING_2),
  ...code([
    '// Monthly book narrative prompt',
    'const prompt = `Tulis narasi refleksi bulanan yang hangat untuk ${userName}.',
    '',
    'DATA BULAN ${monthName}:',
    '- Total jurnal: ${highlights.totalEntries} entri',
    '- Rata-rata mood: ${highlights.avgMood}/10',
    '- Momen terbaik: "${highlights.bestMoment}"',
    '- Pelajaran terbesar: "${highlights.biggestLesson}"',
    '- Emosi dominan: ${JSON.stringify(highlights.emotionDistribution)}',
    '',
    'Kembalikan JSON:',
    '{',
    '  "title": "judul personal 4-6 kata yang menangkap esensi bulan",',
    '  "narrative": "2-3 paragraf. Hangat, personal, gunakan kamu bukan Anda.",',
    '  "mood_story": "1 paragraf tentang perjalanan emosi bulan ini",',
    '  "growth_summary": "1 kalimat tentang pertumbuhan paling signifikan"',
    '}`;',
  ]),
  ...sp(1),
  H('9.3  Example Output',HeadingLevel.HEADING_2),
  new Paragraph({
    spacing:{before:80,after:80},
    border:{left:{style:BorderStyle.SINGLE,size:10,color:C.amber,space:1}},
    indent:{left:280,right:240},
    shading:{type:ShadingType.CLEAR,fill:C.lightA},
    children:[
      new TextRun({text:'"Mei — Bulan Keberanian Kecil"\n\n',font:'Arial',size:21,bold:true,color:C.dark}),
      new TextRun({text:'Mei adalah bulan di mana kamu menemukan kembali makna kecil di hari-hari yang berat. Di tengah 24 jurnal yang kamu tulis, ada satu benang merah yang konsisten: keluarga selalu menjadi tempat kamu menemukan ketenangan.\n\nStreak 14 harimu bukan hanya tentang konsistensi — itu adalah bukti bahwa kamu memprioritaskan dirimu sendiri di tengah kesibukan. Rata-rata moodmu naik 18% dibanding bulan lalu. Kamu tumbuh.\n\nPelajaran terbesarmu bulan ini: "Konsistensi lebih penting dari kesempurnaan." Semoga bulan depan membawa lebih banyak momen kecil yang layak disyukuri.',font:'Arial',size:21,italic:true,color:C.slate}),
    ]
  }),
  ...sp(1),PB(),
];

// ─── S10 PERSONALIZATION ─────────────────────────────────────
const s10=[
  secHead('✨','SECTION 10 — PERSONALIZATION ENGINE'),
  hr(),
  H('10.1  3-Tier Data Model',HeadingLevel.HEADING_2),
  T(['Tier','Source','Data collected','Updated'],
    [
      ['Tier 1: Explicit',    'Onboarding + user_preferences',   'journaling_goal, reminder_time, language, notification prefs, feature preferences',     'On user change'],
      ['Tier 2: Behavioral',  'activity_events + journal patterns','Preferred writing hour, avg session duration, most used features, streak type',       'Daily via analytics'],
      ['Tier 3: AI-inferred', 'ai_user_memory + emotion_analysis','Emotional patterns, stress triggers, gratitude themes, communication tone preference','Every 3rd journal'],
    ],
    [1000,1600,4200,2560],C.indigo),
  ...sp(1),
  H('10.2  Personalization Applications',HeadingLevel.HEADING_2),
  T(['Feature','Personalization applied','Data source'],
    [
      ['Bloom greeting',      '"Hai, semangat mengajar hari ini?" — references job/context from memory',     'ai_user_memory (fact)'],
      ['Journal prompts',     'Step 5 prompt changes based on recent stress_triggers from memory',           'ai_user_memory (trigger)'],
      ['Notification time',   'Sent at hour pengguna most frequently journals, not default 21:00',           'activity_events analysis'],
      ['Notification text',   'References current streak + past milestone: "Streak 14 hari! Sama seperti rekor April"','ai_user_memory (achievement)'],
      ['Insight tone',        'High-stress user: supportive. High-optimism user: growth-challenging',        'mv_weekly_user_stats'],
      ['Affirmations (step 14)','Ranked by mood_category today × emotional pattern × past selections',      'emotion_analysis + behavioral'],
      ['Coach questions',     'Tone: supportive/analytical/challenging based on current stress level',       'EI scores + communication_tone pref'],
      ['Garden aesthetics',   'Background theme adapts to dominant mood color of the week',                 'mv_weekly_user_stats'],
    ],
    [1600,3200,4560],C.teal),
  ...sp(1),
  H('10.3  Cost Summary',HeadingLevel.HEADING_2),
  T(['Operation','Frequency (active Premium user)','Model','Monthly cost'],
    [
      ['EI analysis',         '~20 journals/month',         'GPT-4o-mini', '~$0.020'],
      ['Embedding (journal)', '~20 journals/month',         'emb-3-small', '~$0.004'],
      ['Memory extraction',   '~7 runs/month (every 3rd)',  'GPT-4o-mini', '~$0.007'],
      ['Daily insights',      '~20/month',                  'GPT-4o-mini', '~$0.010'],
      ['Weekly insights',     '~4/month',                   'GPT-4o-mini', '~$0.004'],
      ['Monthly book',        '1/month',                    'GPT-4o',      '~$0.050'],
      ['AI Coach sessions',   '~30 sessions/month',         'GPT-4o',      '~$0.600'],
      ['Weekly recommendations','4/month',                  'GPT-4o-mini', '~$0.008'],
      ['Total Premium user',  '—',                          '—',           {text:'~$0.703/month',bold:true}],
      ['Total Free user',     '~5 EI + embed + insight only','Mixed',      {text:'~$0.060/month',bold:true}],
    ],
    [2400,2200,1400,3360],C.green),
  P('Premium Rp 49K (~$3.00) − AI cost $0.703 = gross margin ~76.6%. Highly profitable at scale.', {italic:true, color:C.mid}),
  ...sp(2),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:200,after:40},children:[new TextRun({text:'🧠  MindBloom AI Brain v1.0  🧠',font:'Arial',size:28,bold:true,color:C.indigo})]}),
  new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'10 AI Systems · OpenAI GPT-4o · pgvector RAG · Long-term Memory · May 2025',font:'Arial',size:20,italic:true,color:C.slate})]}),
];

// ─── BUILD ───────────────────────────────────────────────────
const doc=new Document({
  numbering:{config:[
    {reference:'bullets',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:480,hanging:240}}}}]},
    {reference:'numbers',levels:[{level:0,format:LevelFormat.DECIMAL,text:'%1.',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:480,hanging:240}}}}]},
  ]},
  styles:{
    default:{document:{run:{font:'Arial',size:22,color:C.slate}}},
    paragraphStyles:[
      {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:44,bold:true,font:'Arial',color:C.dark},paragraph:{spacing:{before:480,after:160},outlineLevel:0}},
      {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:30,bold:true,font:'Arial',color:C.indigo},paragraph:{spacing:{before:280,after:100},outlineLevel:1}},
      {id:'Heading3',name:'Heading 3',basedOn:'Normal',next:'Normal',quickFormat:true,run:{size:24,bold:true,font:'Arial',color:C.teal},paragraph:{spacing:{before:180,after:80},outlineLevel:2}},
    ]
  },
  sections:[{
    properties:{page:{size:{width:12240,height:15840},margin:{top:1080,right:1080,bottom:1080,left:1080}}},
    headers:{default:new Header({children:[new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:C.indigo,space:1}},spacing:{before:0,after:120},children:[new TextRun({text:'🧠  MindBloom AI Brain — Technical Architecture v1.0',font:'Arial',size:18,color:C.indigo})]})]})},
    footers:{default:new Footer({children:[new Paragraph({border:{top:{style:BorderStyle.SINGLE,size:4,color:C.indigo,space:1}},spacing:{before:120,after:0},tabStops:[{type:TabStopType.RIGHT,position:9360}],children:[new TextRun({text:'Confidential · May 2025   \t',font:'Arial',size:16,color:C.slate}),new TextRun({children:[new SimpleField('PAGE')],font:'Arial',size:16,color:C.indigo})]})]})},
    children:[...cover,...s1,...s2,...s3,...s4,...s5,...s6,...s7,...s8,...s9,...s10]
  }]
});

Packer.toBuffer(doc).then(buf=>{
  fs.writeFileSync('/mnt/user-data/outputs/MindBloom_AI_Brain_Technical_Doc.docx',buf);
  console.log('✅ Done: MindBloom_AI_Brain_Technical_Doc.docx');
}).catch(e=>{console.error(e);process.exit(1);});
