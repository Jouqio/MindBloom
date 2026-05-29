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
  code:'1E293B', mid:'94A3B8',
};

const b = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };
const borders = { top:b, bottom:b, left:b, right:b };
const nb = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top:nb, bottom:nb, left:nb, right:nb };

const sp = (n=1) => Array.from({length:n}, () =>
  new Paragraph({ children:[new TextRun('')], spacing:{before:0,after:0} }));
const PB = () => new Paragraph({ children:[new PageBreak()] });

function hr(color=C.indigo) {
  return new Paragraph({
    spacing:{before:160,after:160},
    border:{ bottom:{ style:BorderStyle.SINGLE, size:4, color, space:1 } },
    children:[new TextRun('')]
  });
}

function H(text, level=HeadingLevel.HEADING_2, color=C.indigo) {
  const sz={[HeadingLevel.HEADING_1]:44,[HeadingLevel.HEADING_2]:30,[HeadingLevel.HEADING_3]:24,[HeadingLevel.HEADING_4]:22};
  const sp2={[HeadingLevel.HEADING_1]:480,[HeadingLevel.HEADING_2]:280,[HeadingLevel.HEADING_3]:180,[HeadingLevel.HEADING_4]:140};
  return new Paragraph({
    heading:level, spacing:{before:sp2[level]||140,after:80},
    children:[new TextRun({text,bold:true,color,font:'Arial',size:sz[level]||22})]
  });
}

function P(text, opts={}) {
  return new Paragraph({
    spacing:{before:opts.before||60,after:opts.after||60},
    indent:opts.indent?{left:opts.indent}:undefined,
    children:[new TextRun({text,font:'Arial',size:opts.size||21,
      bold:opts.bold||false,italic:opts.italic||false,color:opts.color||C.slate})]
  });
}

function mixed(runs) {
  return new Paragraph({
    spacing:{before:60,after:60},
    children: runs.map(r => new TextRun({
      text:r.text, font:r.mono?'Courier New':'Arial',
      size:r.size||(r.mono?18:21), bold:r.bold||false,
      italic:r.italic||false, color:r.color||C.slate
    }))
  });
}

function B(text) {
  return new Paragraph({
    numbering:{reference:'bullets',level:0}, spacing:{before:30,after:30},
    children:[new TextRun({text,font:'Arial',size:21,color:C.slate})]
  });
}

function N(text) {
  return new Paragraph({
    numbering:{reference:'numbers',level:0}, spacing:{before:30,after:30},
    children:[new TextRun({text,font:'Arial',size:21,color:C.slate})]
  });
}

function code(lines) {
  const arr = Array.isArray(lines)?lines:[lines];
  return arr.map(line => new Paragraph({
    spacing:{before:16,after:16}, indent:{left:360},
    shading:{type:ShadingType.CLEAR,fill:'F1F5F9'},
    children:[new TextRun({text:line,font:'Courier New',size:18,color:C.code})]
  }));
}

function callout(text,fill=C.lightI,borderColor=C.indigo) {
  return new Paragraph({
    spacing:{before:120,after:120},
    border:{left:{style:BorderStyle.SINGLE,size:14,color:borderColor,space:1}},
    indent:{left:320,right:240},
    shading:{type:ShadingType.CLEAR,fill},
    children:[new TextRun({text,font:'Arial',size:21,color:C.dark,italic:true})]
  });
}

function secHead(emoji,title,color=C.indigo) {
  return new Paragraph({
    spacing:{before:600,after:160},
    children:[new TextRun({text:`${emoji}  ${title}`,font:'Arial',size:52,bold:true,color})]
  });
}

function T(headers,rows,widths,hFill=C.indigo) {
  const total=widths.reduce((a,b)=>a+b,0);
  return new Table({
    width:{size:total,type:WidthType.DXA}, columnWidths:widths,
    rows:[
      new TableRow({children:headers.map((h,i)=>new TableCell({
        borders, shading:{type:ShadingType.CLEAR,fill:hFill},
        width:{size:widths[i],type:WidthType.DXA},
        margins:{top:80,bottom:80,left:120,right:120},
        children:[new Paragraph({children:[new TextRun({text:h,font:'Arial',size:19,bold:true,color:C.white})]})]
      }))}),
      ...rows.map((r,ri)=>new TableRow({children:r.map((c,ci)=>new TableCell({
        borders,
        shading:{type:ShadingType.CLEAR,fill:ri%2===0?C.white:C.nearW},
        width:{size:widths[ci],type:WidthType.DXA},
        margins:{top:70,bottom:70,left:110,right:110},
        verticalAlign:VerticalAlign.TOP,
        children:[new Paragraph({children:[new TextRun({
          text:String(c.text||c),font:c.mono?'Courier New':'Arial',
          size:c.mono?17:19,bold:c.bold||false,
          color:c.color||C.dark,italic:c.italic||false
        })]})]
      }))}))
    ]
  });
}

// ─── COVER ───────────────────────────────────────────────────
const cover = [
  ...sp(5),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:80},
    children:[new TextRun({text:'🎬',font:'Arial',size:120})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:120},
    children:[new TextRun({text:'MindBloom',font:'Arial',size:96,bold:true,color:C.indigo})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:80},
    children:[new TextRun({text:'Motion Design System',font:'Arial',size:44,color:C.violet})]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:60},
    children:[new TextRun({text:'Framer Motion · 13 Animations · Accessibility-First',font:'Arial',size:26,italic:true,color:C.slate})]}),
  ...sp(2),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:20},
    children:[
      new TextRun({text:'  Page Transition  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.indigo}}),
      new TextRun({text:'   '}),
      new TextRun({text:'  Hero Animation  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.violet}}),
      new TextRun({text:'   '}),
      new TextRun({text:'  Floating Orb  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.teal}}),
    ]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:8,after:8},
    children:[
      new TextRun({text:'  Aurora BG  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.green}}),
      new TextRun({text:'   '}),
      new TextRun({text:'  Mood Selection  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.amber}}),
      new TextRun({text:'   '}),
      new TextRun({text:'  Step Transition  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.pink}}),
    ]}),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:8,after:0},
    children:[
      new TextRun({text:'  AI Typing  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.teal}}),
      new TextRun({text:'   '}),
      new TextRun({text:'  Save Success  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.green}}),
      new TextRun({text:'   '}),
      new TextRun({text:'  Confetti · Achievement · Breath · Chart · Dashboard  ',font:'Arial',size:20,bold:true,color:C.white,shading:{type:ShadingType.CLEAR,fill:C.slate}}),
    ]}),
  ...sp(3),
  new Paragraph({alignment:AlignmentType.CENTER,children:[
    new TextRun({text:'v1.0  ·  May 2025  ·  Confidential',font:'Arial',size:22,italic:true,color:C.slate})]}),
  ...sp(2), PB(),
];

// ─── S1 PRINCIPLES ───────────────────────────────────────────
const s1 = [
  secHead('🎯','SECTION 1 — MOTION PRINCIPLES'),
  hr(),
  H('1.1  The Three Laws of MindBloom Motion', HeadingLevel.HEADING_2),
  callout('Motion harus melayani pengguna, bukan mempertunjukkan dirinya sendiri. Setiap animasi harus memiliki satu alasan keberadaan: membantu pemahaman, memberikan feedback, atau membangun kepercayaan emosional.', C.lightI),
  ...sp(1),
  T(
    ['Hukum','Prinsip','Implementasi','Pelanggaran (Hindari)'],
    [
      ['1. Purposeful','Setiap animasi harus memiliki fungsi: orientasi, feedback, atau reward','Page transition → membantu orientasi. Confetti → reward keberhasilan. Typing dots → feedback komunikasi.','Animasi dekoratif yang memperlambat aksi utama.'],
      ['2. Honest','Animasi mencerminkan apa yang terjadi di balik layar, bukan menyembunyikannya','Loading state → skeleton shimmer. Save → progress indikator nyata. Streak → animasi api nyata.','Fake loading bars yang tidak mencerminkan progress sebenarnya.'],
      ['3. Empathetic','Tone animasi sesuai konteks emosional — tenang untuk refleksi, ekspresif untuk reward','Jurnal → soft fade. Breathing → slow ease-in-out. Achievement → spring bounce + confetti.','Animasi cepat dan bouncy di halaman stres/trauma. Monoton di halaman perayaan.'],
    ],
    [700,2000,2800,2860],
    C.indigo
  ),
  ...sp(1),
  H('1.2  Motion Vocabulary', HeadingLevel.HEADING_2),
  T(
    ['Token','Value','Easing Curve','Gunakan untuk'],
    [
      ['--ease-default', 'cubic-bezier(0.4, 0, 0.2, 1)', 'Material Standard', 'Navigasi, komponen umum, state transitions'],
      ['--ease-out',     'cubic-bezier(0, 0, 0.2, 1)',   'Fast start, slow end', 'Elemen masuk layar (enter animations)'],
      ['--ease-in',      'cubic-bezier(0.4, 0, 1, 1)',   'Slow start, fast end', 'Elemen keluar layar (exit animations)'],
      ['--ease-spring',  'cubic-bezier(0.34, 1.56, 0.64, 1)', 'Overshoot slight', 'Mood picker, CTA button, success states'],
      ['--ease-bounce',  'cubic-bezier(0.68, -0.55, 0.265, 1.55)', 'Strong bounce', 'Achievement icon, confetti, rare rewards'],
      ['ease-in-out',    'CSS default sinusoidal', 'Smooth organic', 'Breathing circle, orbs, aurora — ambient only'],
    ],
    [1400,2200,1500,3260],
    C.slate
  ),
  ...sp(1),
  H('1.3  Duration Scale', HeadingLevel.HEADING_2),
  T(
    ['Token','Value','When to Use'],
    [
      ['dur.instant', '0ms',   'Nilai yang tidak perlu transisi (toggle boolean, show/hide sederhana)'],
      ['dur.fast',    '100ms', 'Hover state, focus ring, active press feedback'],
      ['dur.base',    '150ms', 'Tooltip, badge, small state changes'],
      ['dur.slow',    '250ms', 'Page transition, card hover, modal/sheet open'],
      ['dur.slower',  '400ms', 'Staggered children, chart bar, hero elements'],
      ['dur.slowest', '600ms', 'Achievement card, complex multi-step reveals'],
      ['dur.breath',  '4000ms','Breathing circle expand/contract — harus terasa organik'],
      ['dur.aurora',  '18–26s','Ambient aurora orbs — terlalu cepat terasa mengganggu'],
    ],
    [1200,1000,7160],
    C.teal
  ),
  P('Aturan emas: jika ragu, gunakan 250ms ease-out. Hampir semua animasi UI terasa benar di durasi ini.', {italic:true, color:C.mid}),
  ...sp(1), PB(),
];

// ─── S2 ALL 13 ANIMATIONS ────────────────────────────────────
const s2 = [
  secHead('🎬','SECTION 2 — 13 ANIMATION SPECIFICATIONS'),
  hr(),

  // 1. Page Transition
  H('Animation 1 — Page Transition', HeadingLevel.HEADING_2, C.indigo),
  callout('Target: Apple + Linear level. Subtle Y shift prevents disorientation. Full horizontal slide (common) terasa agresif — hindari.'),
  T(
    ['Property','Value','Notes'],
    [
      ['Exit motion',    'opacity 1→0, translateY 0→-8px', 'Naik sedikit, seperti slide ditarik ke atas'],
      ['Enter motion',   'opacity 0→1, translateY 16→0px', 'Turun masuk — arah berlawanan dengan exit'],
      ['Exit duration',  '250ms ease-in',                  'Fast exit, jangan tahan pengguna'],
      ['Enter duration', '300ms ease-out',                  'Sedikit lebih lambat — konten baru perlu "settle"'],
      ['Trigger',        'router.push() / NavigationEvent', 'AnimatePresence mode="wait" di root layout'],
      ['File',           'src/components/motion/PageWrapper.tsx', 'Wrap setiap page component'],
      ['A11y fallback',  'opacity only 100ms, no Y shift',  'Reduced motion: tidak ada pergerakan posisi'],
    ],
    [1600,2800,4960],
    C.indigo
  ),
  ...sp(1),
  ...code([
    '// Framer Motion implementation',
    "const pageVariants = {",
    "  initial: { opacity: 0, y: 16 },",
    "  animate: { opacity: 1, y: 0 },",
    "  exit:    { opacity: 0, y: -8 },",
    "}",
    "const pageTransition = { duration: 0.25, ease: [0, 0, 0.2, 1] }",
    "",
    "// Usage: wrap every page",
    "<motion.div variants={pageVariants} initial='initial'",
    "  animate='animate' exit='exit' transition={pageTransition}>",
    "  {children}",
    "</motion.div>",
  ]),
  ...sp(1),

  // 2. Hero Animation
  H('Animation 2 — Hero Section (Stagger)', HeadingLevel.HEADING_2, C.indigo),
  callout('4 elemen masuk berurutan dengan stagger 80ms. CTA mendapat spring easing — sedikit overshoot memberi kesan "hidup". Triggered sekali saat mount.'),
  T(
    ['Element','Delay','Duration','Easing','Motion'],
    [
      ['Badge pill',  '0ms',   '500ms', 'ease-out', 'translateY 16→0, opacity 0→1'],
      ['H1 Title',    '80ms',  '550ms', 'ease-out', 'translateY 16→0, opacity 0→1'],
      ['Subtitle',    '160ms', '500ms', 'ease-out', 'translateY 16→0, opacity 0→1'],
      ['CTA Button',  '240ms', '450ms', 'spring cubic-bezier(.34,1.56,.64,1)', 'translateY 12→0, scale .97→1, opacity 0→1'],
    ],
    [1400,1000,1000,2400,4560],
    C.violet
  ),
  ...sp(1),

  // 3. Floating Orbs
  H('Animation 3 — Floating Orbs', HeadingLevel.HEADING_2, C.indigo),
  callout('Tiga orbs dengan speed berbeda menciptakan gerakan organik tanpa sinkronisasi yang terasa artificial. CSS animation dipilih atas JS untuk performa — tidak ada JS per frame.'),
  T(
    ['Orb','Color','Size','Duration','Delay','Motion range'],
    [
      ['Purple', '#AFA9EC → #EEEDFE40', '480px', '18s', '0s',  'x ±28px, y ±22px, scale .94–1.06'],
      ['Teal',   '#9FE1CB → #E1F5EE40', '360px', '22s', '3s',  'x ±22px, y ±24px, scale .92–1.08'],
      ['Amber',  '#FAC775 → #FAEEDA40', '280px', '26s', '7s',  'x ±16px, y ±16px, scale .90–1.12'],
    ],
    [800,2000,800,1000,800,4960],
    C.teal
  ),
  P('Semua orbs: filter: blur(80px), opacity: 0.20, will-change: transform, position: fixed z-index: 0. Pause saat document.hidden untuk battery life.', {italic:true, color:C.mid}),
  ...sp(1),

  // 4. Aurora
  H('Animation 4 — Aurora Background', HeadingLevel.HEADING_2, C.indigo),
  callout('Canvas-based — bukan CSS. Memberi fleksibilitas lebih untuk warna dan blend mode. requestAnimationFrame dengan tick += 0.008 radian/frame menghasilkan siklus ~13 detik pada 60fps.'),
  T(
    ['Property','Value','Rationale'],
    [
      ['Technique',     'Canvas 2D + requestAnimationFrame', 'CSS gradient tidak bisa blend secara dynamic'],
      ['Tick speed',    '0.008 rad/frame (~13s cycle)',       'Lambat = ambient. Cepat = distracting'],
      ['Opacity light', '0.20 per orb',                      'Subtle — tidak compete dengan konten'],
      ['Opacity dark',  '0.10 per orb',                      'Dark mode: lebih rendah, hindari glare'],
      ['4 orbs',        'purple, teal, amber, pink',         'Variasi warna mood MindBloom'],
      ['Pause on',      'document.visibilitychange = hidden', 'Save battery + CPU pada background tab'],
      ['A11y fallback', 'Static radial-gradient CSS',         'Reduced motion: static gradient, no RAF'],
    ],
    [1600,2600,5160],
    C.green
  ),
  ...sp(1),

  // 5. Mood Selection
  H('Animation 5 — Mood Selection', HeadingLevel.HEADING_2, C.indigo),
  callout('Animasi paling sering diinteraksi — harus terasa responsif dan menyenangkan. Spring easing dengan overshoot kecil membuat pemilihan terasa seperti "snap" yang memuaskan.'),
  T(
    ['Interaction','Motion','Duration','Easing'],
    [
      ['Hover emoji node',  'scale 1 → 1.18',                          '100ms', 'spring cubic-bezier(.34,1.56,.64,1)'],
      ['Select emoji',      'scale 1 → 1.22 + border+bg color change', '200ms', 'spring — slight overshoot'],
      ['Tap/press',         'scale 1 → 0.90 (instant feedback)',        '80ms',  'linear'],
      ['Big emoji appear',  'scale 0.6→1, opacity 0→1',                 '300ms', 'spring'],
      ['Big emoji change',  'scale 1→0.8 (exit) + 0.6→1 (enter)',      '120+180ms', 'ease-in + spring'],
      ['Slider move',       'emoji morphs every integer change',         '100ms', 'ease-in-out'],
      ['Color bar lerp',    'merah(1) → kuning(5) → hijau(10)',         'real-time', 'CSS color-mix()'],
    ],
    [1800,2200,1000,4360],
    C.amber
  ),
  ...sp(1),

  // 6. Step Transition
  H('Animation 6 — Journal Step Transition', HeadingLevel.HEADING_2, C.indigo),
  callout('Horizontal swipe direction memberi spatial metaphor — maju ke kanan, mundur ke kiri. Height animasi container mencegah layout shift saat step lebih tinggi/rendah.'),
  T(
    ['Direction','Exit motion','Enter motion','Duration'],
    [
      ['Forward (next)', 'opacity 1→0, translateX 0→-24px (200ms ease-in)',  'opacity 0→1, translateX +32→0px (280ms ease-out)',  '~480ms total'],
      ['Backward (prev)','opacity 1→0, translateX 0→+24px (200ms ease-in)', 'opacity 0→1, translateX -32→0px (280ms ease-out)', '~480ms total'],
    ],
    [1400,3200,3200,1560],
    C.violet
  ),
  T(
    ['Sub-element','Animation','Trigger'],
    [
      ['Progress dots', 'inactive→active: scale .8→1.3 + color purple, done: scale 1 + color green, 200ms spring', 'Step change'],
      ['Step counter',  '"Langkah 2 dari 15" — aria-live="polite" announces to screen reader', 'Step change'],
      ['Container height', 'animate layout height between steps — Framer Motion layout prop', 'Automatic per step'],
      ['Auto-save indicator', 'Fade in check icon bottom-right after 30s debounce', 'onChange + debounce'],
    ],
    [1400,4400,3560],
    C.slate
  ),
  ...sp(1),

  // 7. AI Typing
  H('Animation 7 — AI Typing + Streaming', HeadingLevel.HEADING_2, C.indigo),
  callout('Dua fase: (1) Typing dots 1.4 detik — membangun ekspektasi. (2) Text stream char-by-char 20ms/char — terasa seperti AI benar-benar berpikir. Jangan skip fase dots — perlu untuk natural feel.'),
  T(
    ['Phase','Duration','Motion','Notes'],
    [
      ['Typing dots show', '1400ms', '3 dots muncul, stagger 180ms, bounce y ±4px, opacity .3↔1, loop', 'Sebelum respons AI datang dari server'],
      ['Dots → text', '150ms', 'Dots fade out opacity 1→0, text container fade in', 'Smooth swap'],
      ['Text streaming', '20ms/char', 'Char-by-char append ke DOM', 'requestAnimationFrame batching'],
      ['Cursor blink', 'loop 500ms', '| alternates opacity 1↔0 via animate', 'Hilang saat stream selesai'],
      ['Bubble height', '80ms ease-out', 'Framer Motion layout prop — auto-animates height grow', 'Tidak block streaming'],
      ['User bubble', '250ms spring', 'opacity 0→1, scale .97→1, translateY 8→0', 'Saat pengguna kirim pesan'],
    ],
    [1400,1000,2200,4760],
    C.pink
  ),
  ...code([
    '// Streaming text append pattern',
    "const streamConfig = { msPerChar: 20, initialDelay: 1400 }",
    "",
    "// Phase 1: show typing dots",
    "setShowDots(true)",
    "await sleep(streamConfig.initialDelay)",
    "",
    "// Phase 2: stream text",
    "setShowDots(false)",
    "for (const char of responseText) {",
    "  setText(prev => prev + char)",
    "  await sleep(streamConfig.msPerChar)",
    "}",
  ]),
  ...sp(1),

  // 8. Save Success
  H('Animation 8 — Save Success', HeadingLevel.HEADING_2, C.indigo),
  callout('Momen paling emosional di jurnal flow. Animasi harus terasa seperti perayaan yang tulus, bukan notifikasi generik. Overlay muncul di atas form, bukan replace halaman.'),
  T(
    ['Element','Delay','Duration','Easing','Motion'],
    [
      ['Overlay bg',   '0ms',   '350ms', 'spring',    'opacity 0→1, scale .90→1'],
      ['Check icon',   '100ms', '400ms', 'spring bounce', 'scale 0→1 (pop in dari 0)'],
      ['Title text',   '300ms', '300ms', 'ease-out',  'opacity 0→1, translateY 8→0'],
      ['Subtitle',     '400ms', '300ms', 'ease-out',  'opacity 0→1, translateY 6→0'],
      ['Action buttons','550ms','300ms', 'ease-out',  'opacity 0→1'],
      ['Confetti',     '200ms', '2.5s',  'ease-in gravity', '50 partikel, fall + rotate'],
      ['Streak update', '600ms','count-up 1s','ease-out cubic','angka streak naik dari nilai lama'],
    ],
    [1600,800,800,1400,1600,4160],
    C.green
  ),
  ...sp(1),

  // 9. Confetti
  H('Animation 9 — Confetti Reward System', HeadingLevel.HEADING_2, C.indigo),
  callout('Pure DOM + CSS — bukan Framer Motion. Performa lebih baik untuk 50+ partikel simultan. Tiga tier konfeti dengan intensitas berbeda menciptakan hierarki reward yang jelas.'),
  T(
    ['Tier','Trigger','Count','Duration','Colors','Spread'],
    [
      ['Save Journal',      'Jurnal final tersimpan',              '50 partikel', '1.8–3.2s', 'Semua 5 brand colors', '80% viewport'],
      ['Streak Milestone',  '7, 14, 30, 90 hari streak',          '20 partikel', '1.5–2.5s', 'Amber + coral (fire)', '60% viewport'],
      ['Gratitude Add',     'Item syukur ke-5+ ditambahkan',       '8 partikel',  '1.2–2.0s', 'Teal + green',        '40% viewport'],
      ['Achievement Unlock','Badge baru terbuka',                  '20 partikel', '2.0–3.5s', 'Amber + purple',      '70% viewport'],
    ],
    [1600,1800,1000,1000,2000,2960],
    C.amber
  ),
  T(
    ['Shape','Proportion','Size'],
    [
      ['Rectangle', '50%', '8×7px'],
      ['Circle',    '30%', '7×7px'],
      ['Thin ticker','20%','3×14px'],
    ],
    [2000,2000,5360],
    C.slate
  ),
  P('Animasi: translateY(-10px → 100vh) + rotate(0 → 720deg), ease-in gravity fall. Opacity fade mulai di 80% perjalanan. DOM cleanup 100ms setelah animation selesai.', {italic:true, color:C.mid}),
  ...sp(1),

  // 10. Achievement
  H('Animation 10 — Achievement Unlock', HeadingLevel.HEADING_2, C.indigo),
  callout('Momen paling rewarding di gamifikasi MindBloom. Ripple rings menambah epicness tanpa berlebihan. Seluruh sequence selesai dalam 1.2 detik.'),
  T(
    ['Element','Delay','Duration','Easing','Motion'],
    [
      ['Card container', '0ms',  '500ms', 'spring cubic-bezier(.34,1.56,.64,1)', 'opacity 0→1, scale .85→1, y 20→0'],
      ['Ripple ring 1',  '0ms',  '700ms', 'ease-out',    'scale .5→2.5, opacity .8→0 (dissolve)'],
      ['Ripple ring 2',  '150ms','800ms', 'ease-out',    'scale .5→2.6, opacity .6→0 (dissolve)'],
      ['Badge icon',     '200ms','500ms', 'spring bounce','scale 0→1 (hard pop)'],
      ['Badge name',     '450ms','300ms', 'ease-out',    'opacity 0→1, y 6→0'],
      ['Description',    '600ms','300ms', 'ease-out',    'opacity 0→1'],
      ['XP badge',       '750ms','300ms', 'ease-out',    'opacity 0→1'],
      ['Confetti',       '200ms','2–3.5s','gravity',     '20 amber partikel'],
    ],
    [1400,800,800,2000,4360],
    C.red
  ),
  ...sp(1),

  // 11. Breathing
  H('Animation 11 — Breathing Circle', HeadingLevel.HEADING_2, C.indigo),
  callout('Animasi paling kritis untuk kesehatan mental. ease-in-out adalah WAJIB — linear terasa mekanis dan mengganggu konsentrasi. Durasi 4 detik per fase sesuai fisiologi box breathing.'),
  T(
    ['Phase','Circle size','Ring 1','Ring 2','Color','Duration','Easing'],
    [
      ['Idle',      '140px', '180px', '200px', 'purple .15',     '—',   '—'],
      ['Inhale',    '180px', '225px', '255px', 'purple .22',     '4s',  'ease-in-out WAJIB'],
      ['Hold (in)', '180px', '225px', '255px', 'purple .22',     '4s',  'ease-in-out — pulse .02 scale'],
      ['Exhale',    '126px', '165px', '185px', 'teal .18',       '4s',  'ease-in-out WAJIB'],
      ['Hold (out)','126px', '165px', '185px', 'teal .15',       '4s',  'ease-in-out'],
    ],
    [1100,1000,800,800,1200,800,3660],
    C.teal
  ),
  T(
    ['Sub-element','Behavior'],
    [
      ['Countdown number', '4→3→2→1 tiap 1000ms. Number fade cross: opacity 1→0→1 dalam 200ms saat berganti.'],
      ['Phase label',      '"Tarik nafas..." / "Tahan..." / "Buang nafas..." — immediate update, no animation.'],
      ['Color transition', 'background color lerp antara fase: purple (inhale) ↔ teal (exhale). Transition 2s ease.'],
      ['Pause/resume',     'State freeze saat pause. Size tetap. Countdown berhenti. Resume dari posisi yang sama.'],
      ['Cycle counter',    'Naik setelah setiap full cycle (4 fase). No animation — informasi saja.'],
      ['A11y WAJIB',       'Reduced motion: ukuran tidak berubah. Hanya countdown angka + teks fase yang berubah. Fully functional.'],
    ],
    [2000,7360],
    C.slate
  ),
  ...sp(1),

  // 12. Chart
  H('Animation 12 — Chart Animations', HeadingLevel.HEADING_2, C.indigo),
  callout('Trigger via IntersectionObserver — animasi dimulai saat chart masuk viewport, bukan saat page load. Stagger per bar membuat data "tumbuh" secara organik.'),
  T(
    ['Chart Type','Animation','Duration','Easing','Notes'],
    [
      ['Bar chart — enter',   'scaleY 0→1 per bar, stagger 60ms, origin bottom', '500ms per bar', 'spring cubic-bezier(.34,1.56,.64,1)', 'transformOrigin: bottom'],
      ['Bar chart — update',  'height tween dari nilai lama ke baru', '400ms', 'ease-out', 'Saat data berubah (filter minggu/bulan)'],
      ['Line chart — draw',   'stroke-dashoffset path draw from left', '800ms', 'ease-out', 'Framer Motion pathLength 0→1'],
      ['Line fill — appear',  'opacity 0→1 setelah line selesai', '400ms delay 600ms', 'ease-out', 'Fill area di bawah garis'],
      ['Tooltip hover',       'opacity 0→1, translateY 4→0, scale .96→1', '150ms', 'ease-out', 'On hover/focus per data point'],
      ['Progress ring draw',  'stroke-dashoffset animasi dari full ke target', '1.2s delay 300ms', 'ease-out', 'Setelah widget masuk viewport'],
    ],
    [1500,2200,1200,2200,2260],
    C.blue
  ),
  ...sp(1),

  // 13. Dashboard
  H('Animation 13 — Dashboard Widget Grid', HeadingLevel.HEADING_2, C.indigo),
  callout('Dashboard adalah halaman yang paling sering dibuka. Animasi harus terasa segar setiap hari tapi tidak membosankan. Stagger grid menciptakan sense of depth yang kaya tanpa overwhelming.'),
  T(
    ['Element','Delay','Duration','Easing','Motion'],
    [
      ['Widget 1 (Streak)',  '0ms',   '400ms', 'spring', 'opacity 0→1, scale .96→1, y 12→0'],
      ['Widget 2 (Score)',   '60ms',  '400ms', 'spring', 'opacity 0→1, scale .96→1, y 12→0'],
      ['Widget 3 (Mood)',    '120ms', '400ms', 'spring', 'opacity 0→1, scale .96→1, y 12→0'],
      ['Widget 4 (Energy)',  '180ms', '400ms', 'spring', 'opacity 0→1, scale .96→1, y 12→0'],
      ['Streak number',      '100ms', '1000ms','ease-out cubic', 'Count-up: 0 → actual value'],
      ['Progress ring',      '300ms', '1200ms','ease-out', 'stroke-dashoffset: full → target'],
      ['Battery fill',       '300ms', '1000ms','ease-out', 'width: 0% → actual%'],
      ['Gratitude score',    '400ms', '1000ms','ease-out cubic', 'Count-up: 0 → actual'],
    ],
    [1800,800,800,1400,4560],
    C.green
  ),
  P('Widget hover: translateY 0→-2px + box-shadow upgrade, duration 250ms ease-out. Tidak ada scale pada hover (terlalu dramatic untuk data widgets).', {italic:true, color:C.mid}),
  ...sp(1), PB(),
];

// ─── S3 ACCESSIBILITY ─────────────────────────────────────────
const s3 = [
  secHead('♿','SECTION 3 — ACCESSIBILITY & REDUCED MOTION'),
  hr(),
  H('3.1  prefers-reduced-motion Rules', HeadingLevel.HEADING_2),
  callout('Semua animasi WAJIB memiliki reduced-motion fallback. Pengguna yang memilih reduced motion bukan berarti tidak mau pengalaman yang baik — mereka butuh pengalaman yang tidak memicu vertigo atau distraksi.'),
  T(
    ['Animation','Reduced Motion Behavior','Information Loss?'],
    [
      ['Page Transition',     'Opacity only 100ms, no Y movement',                         'Tidak ada'],
      ['Hero Stagger',        'Semua elemen muncul sekaligus opacity 1, delay tetap ada',   'Tidak ada'],
      ['Floating Orbs',       'animation-play-state: paused — orb statis sebagai dekorasi', 'Tidak ada'],
      ['Aurora Background',   'Static radial-gradient CSS, tidak ada RAF loop',             'Tidak ada'],
      ['Mood Picker',         'No scale animation — border+color change only',              'Tidak ada'],
      ['Journal Step',        'Instant swap, no slide — opacity crossfade 100ms',           'Tidak ada'],
      ['AI Typing Dots',      'Static 3 dots terlihat, teks muncul setelah 800ms delay',    'Tidak ada'],
      ['Save Success',        'Overlay muncul seketika, semua elemen opacity 1 langsung',   'Tidak ada'],
      ['Confetti',            'TIDAK MUNCUL — toast + teks sukses sebagai pengganti',       'Tidak ada (toast)'],
      ['Achievement Unlock',  'Card muncul seketika, icon langsung visible, no ripple',     'Tidak ada'],
      ['Breathing Circle',    'Ukuran tidak berubah — HANYA countdown + teks fase berubah', 'Tidak ada'],
      ['Chart Bars',          'Bars muncul di height final langsung, no scale animation',   'Tidak ada'],
      ['Dashboard Widgets',   'Semua widget muncul sekaligus, number di final value',       'Tidak ada'],
    ],
    [2200,4200,2960],
    C.red
  ),
  ...sp(1),
  H('3.2  Implementation Pattern', HeadingLevel.HEADING_2),
  ...code([
    "// Pattern 1: Framer Motion useReducedMotion hook",
    "import { useReducedMotion } from 'framer-motion'",
    "",
    "function AnimatedComponent() {",
    "  const prefersReduced = useReducedMotion()",
    "  return (",
    "    <motion.div",
    "      animate={prefersReduced ? { opacity: 1 } : fullAnimation}",
    "      transition={prefersReduced ? { duration: 0.01 } : fullTransition}",
    "    />",
    "  )",
    "}",
    "",
    "// Pattern 2: CSS media query (for CSS animations)",
    "@media (prefers-reduced-motion: reduce) {",
    "  .orb { animation-play-state: paused; }",
    "  .breath-circle { transition-duration: 0.01ms !important; }",
    "  .confetti-piece { display: none !important; }",
    "}",
    "",
    "// Pattern 3: Utility function in variants.ts",
    "export function getAccessibleVariants(variants, reduced) {",
    "  if (!reduced) return variants",
    "  // Strip x, y, scale, rotate — keep opacity only",
    "  return Object.fromEntries(",
    "    Object.entries(variants).map(([k, v]) => {",
    "      const { x, y, scale, rotate, ...rest } = v",
    "      return [k, { ...rest, transition: { duration: 0.01 } }]",
    "    })",
    "  )",
    "}",
  ]),
  ...sp(1),
  H('3.3  ARIA Requirements per Animation', HeadingLevel.HEADING_2),
  T(
    ['Component','Required ARIA','Implementation'],
    [
      ['Page transitions',   'Tidak perlu — navigasi diumumkan oleh router', 'Next.js router announcement built-in'],
      ['Mood Picker emojis', 'role="radiogroup" + role="radio" + aria-checked + aria-label per emoji', 'Keyboard: Arrow keys navigasi'],
      ['Breathing circle',   'aria-label="Mulai/Hentikan pernapasan" + aria-describedby phase label', 'Countdown: aria-live="polite"'],
      ['AI typing dots',     'role="status" + aria-label="Bloom sedang mengetik"', 'Screen reader tahu AI sedang merespons'],
      ['AI streaming text',  'aria-live="polite" di bubble container', 'Screen reader membaca teks saat muncul'],
      ['Save success overlay','role="dialog" + aria-modal="true" + focus trap', 'ESC key menutup overlay'],
      ['Achievement card',   'role="alertdialog" + aria-live="assertive"', 'Diumumkan segera ke screen reader'],
      ['Chart bars',         'role="img" + aria-label deskripsi data', 'Hidden data table sebagai fallback'],
      ['Dashboard count-up', 'aria-live="polite" — nilai final diumumkan', 'Reduced motion: langsung value final'],
    ],
    [2000,2800,4560],
    C.teal
  ),
  ...sp(1), PB(),
];

// ─── S4 PERFORMANCE ───────────────────────────────────────────
const s4 = [
  secHead('⚡','SECTION 4 — PERFORMANCE GUIDELINES'),
  hr(),
  H('4.1  GPU Compositing Rules', HeadingLevel.HEADING_2),
  callout('Hanya animate properties yang berjalan di compositor thread: transform (translate, scale, rotate) dan opacity. JANGAN animate: width, height, top, left, margin, padding, background-color secara langsung dalam hot path.'),
  T(
    ['Safe to animate','Avoid animating','Alternative'],
    [
      ['transform: translateX/Y', 'left / right / top / bottom', 'Gunakan transform: translate()'],
      ['transform: scale()',      'width / height',               'Gunakan transform: scale() untuk resize visual'],
      ['transform: rotate()',     'border-radius saat loop',      'Set border-radius statis, animate transform'],
      ['opacity',                 'background-color (heavy)',     'Overlay dengan opacity — background statis'],
      ['filter: blur() — saat mount only', 'filter per frame',   'Pre-blur orbs, tidak animate filter value'],
    ],
    [2200,2000,5160],
    C.amber
  ),
  ...sp(1),
  H('4.2  will-change Budget', HeadingLevel.HEADING_2),
  P('will-change menginstruksikan browser untuk membuat layer GPU terpisah. Terlalu banyak = memory waste. MindBloom budget:'),
  T(
    ['Element','will-change value','Reasoning'],
    [
      ['Floating orbs (3 elements)', 'transform', 'Continuous animation — butuh layer tetap'],
      ['Aurora canvas',             'transform', 'Canvas compositing'],
      ['Page wrapper (transition)',  'opacity, transform', 'Only during navigation — remove after'],
      ['Modal / Sheet',             'transform', 'Only saat isVisible = true'],
      ['Breathing circle',          'transform', 'Continuous saat running, remove saat idle'],
      ['Semua card hover',          'JANGAN gunakan will-change', 'Hover terlalu singkat — akan wasted layer'],
      ['Chart bars',                'JANGAN gunakan will-change', 'One-time animation — no persistent layer needed'],
    ],
    [2200,1800,5360],
    C.slate
  ),
  ...sp(1),
  H('4.3  Bundle Size', HeadingLevel.HEADING_2),
  T(
    ['Package','Version','Gzipped Size','Import strategy'],
    [
      ['framer-motion', '11.x', '~43KB',  'Tree-shaking — import only used: { motion, AnimatePresence, useReducedMotion }'],
      ['motion/react',  '11.x', '~17KB',  'Lighter alternative untuk basic animations (Framer Motion v11 split package)'],
      ['CSS animations','n/a',  '~0KB',   'Orbs, aurora, confetti — gunakan CSS keyframes, zero JS bundle'],
    ],
    [1400,800,1400,5760],
    C.indigo
  ),
  ...sp(1), PB(),
];

// ─── S5 FRAMER MOTION CHEATSHEET ──────────────────────────────
const s5 = [
  secHead('📋','SECTION 5 — FRAMER MOTION CHEATSHEET'),
  hr(),
  H('5.1  Essential Patterns', HeadingLevel.HEADING_2),
  T(
    ['Pattern','Code pattern','Use case'],
    [
      ['Fade + slide in',
       "animate={{ opacity:1, y:0 }} initial={{ opacity:0, y:16 }} transition={{ duration:0.25, ease:[0,0,.2,1] }}",
       'Card, hero elements, modals masuk'],
      ['Spring scale',
       "animate={{ scale:1 }} initial={{ scale:0 }} transition={{ type:'spring', damping:12, stiffness:200 }}",
       'Achievement icon, emoji bounce, check icon'],
      ['Stagger children',
       "variants={container} animate='visible' — container: { visible: { transition: { staggerChildren: 0.06 } } }",
       'Dashboard grid, hero elements, badge list'],
      ['AnimatePresence exit',
       "<AnimatePresence mode='wait'><motion.div key={route} ... exit={{ opacity:0, y:-8 }}/>",
       'Page transitions, tab switching, modal'],
      ['Layout animation',
       "<motion.div layout> — auto-animates position/size changes",
       'Chat bubble height grow, accordion, reorder list'],
      ['Viewport trigger',
       "whileInView='visible' viewport={{ once:true, amount:0.5 }}",
       'Chart bars, dashboard widgets, feature cards'],
      ['Reduced motion',
       "const reduced = useReducedMotion() — strip x/y/scale if true",
       'Every animation component — mandatory'],
      ['Path draw',
       "animate={{ pathLength:1 }} initial={{ pathLength:0 }} transition={{ duration:0.8 }}",
       'Line chart, check icon SVG'],
    ],
    [1400,3800,4160],
    C.indigo
  ),
  ...sp(1),
  H('5.2  Common Mistakes to Avoid', HeadingLevel.HEADING_2),
  T(
    ['Mistake','Problem','Fix'],
    [
      ['Animate width/height directly',    'Triggers layout + paint — jank di mobile',              'Gunakan transform: scale() atau Framer layout prop'],
      ['AnimatePresence tanpa key',         'Exit animation tidak jalan',                            'Selalu berikan unique key pada child AnimatePresence'],
      ['will-change pada semua cards',      'Memory overhead besar — lambat di low-end devices',     'Hanya pada continuous/persistent animations'],
      ['duration terlalu panjang (>600ms)', 'Pengguna harus menunggu — frustrasi',                   'Max 400ms untuk UI feedback, 600ms hanya untuk celebrations'],
      ['Animate background-color per frame','High repaint cost',                                     'Gunakan opacity overlay pada solid background'],
      ['Tidak ada reduced motion check',    'Pengguna dengan vestibular disorder terganggu',          'Wajib: useReducedMotion() di setiap motion component'],
      ['Spring tanpa damping',              'Oscillation tidak berhenti — terasa rusak',              'Selalu set damping dan stiffness, atau gunakan cubic-bezier'],
    ],
    [2200,2200,5000],
    C.red
  ),
  ...sp(2),
  new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:200,after:40},
    children:[new TextRun({text:'🎬  MindBloom Motion Design System v1.0  🎬',font:'Arial',size:28,bold:true,color:C.indigo})]}),
  new Paragraph({alignment:AlignmentType.CENTER,children:[
    new TextRun({text:'13 Animations · Framer Motion · Accessibility-First · May 2025',font:'Arial',size:20,italic:true,color:C.slate})]}),
];

// ─── BUILD ────────────────────────────────────────────────────
const doc = new Document({
  numbering:{config:[
    {reference:'bullets',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:480,hanging:240}}}}]},
    {reference:'numbers',levels:[{level:0,format:LevelFormat.DECIMAL,text:'%1.',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:480,hanging:240}}}}]},
  ]},
  styles:{
    default:{document:{run:{font:'Arial',size:22,color:C.slate}}},
    paragraphStyles:[
      {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,
       run:{size:44,bold:true,font:'Arial',color:C.dark},
       paragraph:{spacing:{before:480,after:160},outlineLevel:0}},
      {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,
       run:{size:30,bold:true,font:'Arial',color:C.indigo},
       paragraph:{spacing:{before:280,after:100},outlineLevel:1}},
    ]
  },
  sections:[{
    properties:{page:{size:{width:12240,height:15840},margin:{top:1080,right:1080,bottom:1080,left:1080}}},
    headers:{default:new Header({children:[new Paragraph({
      border:{bottom:{style:BorderStyle.SINGLE,size:4,color:C.indigo,space:1}},
      spacing:{before:0,after:120},
      children:[new TextRun({text:'🎬  MindBloom Motion Design System v1.0',font:'Arial',size:18,color:C.indigo})]
    })]})},
    footers:{default:new Footer({children:[new Paragraph({
      border:{top:{style:BorderStyle.SINGLE,size:4,color:C.indigo,space:1}},
      spacing:{before:120,after:0},
      tabStops:[{type:TabStopType.RIGHT,position:9360}],
      children:[
        new TextRun({text:'Confidential · May 2025   \t',font:'Arial',size:16,color:C.slate}),
        new TextRun({children:[new SimpleField('PAGE')],font:'Arial',size:16,color:C.indigo}),
      ]
    })]})},
    children:[...cover,...s1,...s2,...s3,...s4,...s5]
  }]
});

Packer.toBuffer(doc).then(buf=>{
  fs.writeFileSync('/mnt/user-data/outputs/MindBloom_Motion_Design_System.docx',buf);
  console.log('✅ Done: MindBloom_Motion_Design_System.docx');
}).catch(e=>{console.error(e);process.exit(1);});
