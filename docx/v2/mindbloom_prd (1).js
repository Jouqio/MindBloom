const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, LevelFormat, TabStopType,
  TabStopPosition, PageBreak, SimpleField
} = require('docx');
const fs = require('fs');

// ─── Helpers ───────────────────────────────────────────────────────────────
const W = 9360; // content width DXA (US Letter, 1" margins)
const border = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const COLORS = {
  indigo:  "5B4FE8",
  violet:  "7C6EF5",
  pink:    "FF7B8A",
  green:   "1DB97A",
  amber:   "F0A500",
  red:     "E85B5B",
  slate:   "475569",
  light:   "F1F0FE",
  lightG:  "E8F9F2",
  lightA:  "FEF8E8",
  lightR:  "FEF0F0",
  white:   "FFFFFF",
  nearW:   "FAFAFA",
  gray:    "F3F2FF",
  dark:    "1E1B4B",
};

function h(text, level = HeadingLevel.HEADING_1, color = COLORS.dark) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 400 : level === HeadingLevel.HEADING_2 ? 300 : 200, after: 120 },
    children: [new TextRun({ text, bold: true, color, font: "Arial",
      size: level === HeadingLevel.HEADING_1 ? 36 : level === HeadingLevel.HEADING_2 ? 28 : level === HeadingLevel.HEADING_3 ? 24 : 22
    })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before || 80, after: opts.after || 80 },
    alignment: opts.align || AlignmentType.LEFT,
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [new TextRun({
      text, font: "Arial", size: opts.size || 22,
      bold: opts.bold || false, italic: opts.italic || false,
      color: opts.color || COLORS.slate
    })]
  });
}

function bullet(text, level = 0, color = COLORS.slate) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 21, color })]
  });
}

function num(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 21, color: COLORS.slate })]
  });
}

function spacer(lines = 1) {
  return Array.from({ length: lines }, () => new Paragraph({ children: [new TextRun("")], spacing: { before: 0, after: 0 } }));
}

function hr() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E0DEFF", space: 1 } },
    children: [new TextRun("")]
  });
}

function badge(text, fill = COLORS.indigo) {
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({
      text: `  ${text}  `,
      font: "Arial", size: 18, bold: true, color: COLORS.white,
      shading: { type: ShadingType.CLEAR, fill }
    })]
  });
}

function inlineLabel(label, value, labelColor = COLORS.indigo) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: `${label}: `, font: "Arial", size: 21, bold: true, color: labelColor }),
      new TextRun({ text: value, font: "Arial", size: 21, color: COLORS.slate })
    ]
  });
}

function colorRow(cells, fill = COLORS.gray) {
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      borders,
      shading: { type: ShadingType.CLEAR, fill },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: c.text || c, font: "Arial", size: 20, bold: c.bold || false, color: c.color || COLORS.dark })] })]
    }))
  });
}

function headerRow(cells, fill = COLORS.indigo) {
  return new TableRow({
    children: cells.map(c => new TableCell({
      borders,
      shading: { type: ShadingType.CLEAR, fill },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: c, font: "Arial", size: 20, bold: true, color: COLORS.white })] })]
    }))
  });
}

function table(headers, rows, colWidths, headerFill = COLORS.indigo) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      headerRow(headers, headerFill),
      ...rows.map((r, ri) => new TableRow({
        children: r.map((c, ci) => new TableCell({
          borders,
          width: { size: colWidths[ci], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? COLORS.white : COLORS.nearW },
          margins: { top: 70, bottom: 70, left: 110, right: 110 },
          children: [new Paragraph({ children: [new TextRun({ text: String(c.text || c), font: "Arial", size: 19, bold: c.bold || false, color: c.color || COLORS.slate })] })]
        }))
      }))
    ]
  });
}

function priorityCell(p) {
  const map = { P0: ["E85B5B","P0 — Critical"], P1: ["F0A500","P1 — High"], P2: ["1DB97A","P2 — Medium"], P3: ["94A3B8","P3 — Low"] };
  const [color, label] = map[p] || ["94A3B8", p];
  return { text: label, color, bold: true };
}

function sectionTitle(emoji, title) {
  return new Paragraph({
    spacing: { before: 480, after: 160 },
    children: [
      new TextRun({ text: `${emoji}  ${title}`, font: "Arial", size: 40, bold: true, color: COLORS.dark })
    ]
  });
}

function storyCard(id, title, description, acceptance, priority, sprint, phase) {
  const pColors = { P0: COLORS.red, P1: COLORS.amber, P2: COLORS.green, P3: COLORS.slate };
  const phaseColors = { "Phase 1": COLORS.indigo, "Phase 2": COLORS.violet, "Phase 3": COLORS.pink, "Phase 4": COLORS.amber, "Phase 5": COLORS.green, "Phase 6": COLORS.slate };
  return [
    new Table({
      width: { size: W, type: WidthType.DXA },
      columnWidths: [W],
      rows: [
        new TableRow({
          children: [new TableCell({
            borders: { top: { style: BorderStyle.SINGLE, size: 6, color: pColors[priority] || COLORS.indigo }, bottom: border, left: border, right: border },
            shading: { type: ShadingType.CLEAR, fill: COLORS.white },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({ spacing: { before: 0, after: 60 }, children: [
                new TextRun({ text: `${id}  `, font: "Arial", size: 18, bold: true, color: COLORS.indigo }),
                new TextRun({ text: `  ${priority}  `, font: "Arial", size: 18, bold: true, color: COLORS.white, shading: { type: ShadingType.CLEAR, fill: pColors[priority] || COLORS.indigo } }),
                new TextRun({ text: `   ${phase}  `, font: "Arial", size: 18, bold: true, color: COLORS.white, shading: { type: ShadingType.CLEAR, fill: phaseColors[phase] || COLORS.slate } }),
                new TextRun({ text: `   Sprint ${sprint}`, font: "Arial", size: 18, color: COLORS.slate }),
              ]}),
              new Paragraph({ spacing: { before: 40, after: 60 }, children: [new TextRun({ text: title, font: "Arial", size: 24, bold: true, color: COLORS.dark })] }),
              new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: description, font: "Arial", size: 20, color: COLORS.slate })] }),
              new Paragraph({ spacing: { before: 40, after: 20 }, children: [new TextRun({ text: "✓ Acceptance Criteria:", font: "Arial", size: 19, bold: true, color: COLORS.green })] }),
              ...acceptance.map(a => new Paragraph({ spacing: { before: 20, after: 20 }, indent: { left: 360 }, children: [new TextRun({ text: `• ${a}`, font: "Arial", size: 19, color: COLORS.slate })] })),
            ]
          })]
        })
      ]
    }),
    ...spacer(1)
  ];
}

// ─── COVER PAGE ──────────────────────────────────────────────────────────────
const coverPage = [
  ...spacer(4),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: "🌱", font: "Arial", size: 96 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
    children: [new TextRun({ text: "MindBloom", font: "Arial", size: 80, bold: true, color: COLORS.indigo })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: "Product Specification & Engineering Backlog", font: "Arial", size: 36, color: COLORS.violet })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 40 },
    children: [new TextRun({ text: "AI Mental Wellness Platform  •  v2.0  •  2025", font: "Arial", size: 26, italic: true, color: COLORS.slate })]
  }),
  ...spacer(2),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 40 },
    children: [
      new TextRun({ text: "  Phase 1: Core  ", font: "Arial", size: 20, bold: true, color: COLORS.white, shading: { type: ShadingType.CLEAR, fill: COLORS.indigo } }),
      new TextRun({ text: "   " }),
      new TextRun({ text: "  Phase 2: Premium  ", font: "Arial", size: 20, bold: true, color: COLORS.white, shading: { type: ShadingType.CLEAR, fill: COLORS.violet } }),
      new TextRun({ text: "   " }),
      new TextRun({ text: "  Phase 3: AI Coach  ", font: "Arial", size: 20, bold: true, color: COLORS.white, shading: { type: ShadingType.CLEAR, fill: COLORS.pink } }),
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 0 },
    children: [
      new TextRun({ text: "  Phase 4: Memory Vault  ", font: "Arial", size: 20, bold: true, color: COLORS.white, shading: { type: ShadingType.CLEAR, fill: COLORS.amber } }),
      new TextRun({ text: "   " }),
      new TextRun({ text: "  Phase 5: Mobile  ", font: "Arial", size: 20, bold: true, color: COLORS.white, shading: { type: ShadingType.CLEAR, fill: COLORS.green } }),
      new TextRun({ text: "   " }),
      new TextRun({ text: "  Phase 6: Monetization  ", font: "Arial", size: 20, bold: true, color: COLORS.white, shading: { type: ShadingType.CLEAR, fill: COLORS.slate } }),
    ]
  }),
  ...spacer(3),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 1: PRODUCT VISION ───────────────────────────────────────────────
const section1 = [
  sectionTitle("🎯", "SECTION 1 — PRODUCT VISION"),
  hr(),
  h("1.1  Product Vision Statement", HeadingLevel.HEADING_2),
  new Paragraph({
    spacing: { before: 80, after: 160 },
    shading: { type: ShadingType.CLEAR, fill: COLORS.light },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: COLORS.indigo, space: 1 } },
    indent: { left: 360, right: 360 },
    children: [new TextRun({
      text: '"MindBloom menjadi Personal AI Reflection Companion terpercaya bagi jutaan orang di Asia Tenggara — membantu mereka memahami emosi, mengurangi overthinking, dan membangun pertumbuhan diri jangka panjang melalui journaling yang cerdas, empatik, dan menyenangkan."',
      font: "Arial", size: 23, italic: true, color: COLORS.dark
    })]
  }),
  ...spacer(1),
  h("1.2  Mission", HeadingLevel.HEADING_2),
  p("Membuat refleksi diri menjadi kebiasaan harian yang menyenangkan, terasa personal, dan didukung oleh kecerdasan buatan yang empatik — bukan sekadar aplikasi tulis catatan."),
  ...spacer(1),
  h("1.3  Core Beliefs", HeadingLevel.HEADING_2),
  bullet("Setiap orang berhak memiliki teman refleksi yang tidak menghakimi."),
  bullet("Konsistensi kecil setiap hari menghasilkan transformasi besar."),
  bullet("Data emosi yang tepat menghasilkan insight yang mengubah hidup."),
  bullet("Teknologi AI harus membuat manusia lebih manusiawi, bukan lebih terisolasi."),
  bullet("Kesehatan mental adalah kebutuhan primer, bukan kemewahan."),
  ...spacer(1),
  h("1.4  Product Goals (OKRs)", HeadingLevel.HEADING_2),
  table(
    ["Objective", "Key Result", "Target", "Timeline"],
    [
      ["Bangun fondasi produk kuat", "MAU mencapai 10.000 pengguna", "10K MAU", "Q2 2025"],
      ["Tingkatkan retensi pengguna", "Day-30 retention ≥ 40%", "40%", "Q3 2025"],
      ["Validasi AI Coach", "AI Coach session/user ≥ 3x/minggu", "3 sesi", "Q3 2025"],
      ["Capai product-market fit", "NPS ≥ 65", "NPS 65+", "Q4 2025"],
      ["Launch monetisasi", "Paid conversion ≥ 8%", "8% conv.", "Q4 2025"],
      ["Capai profitabilitas awal", "MRR ≥ Rp 200 juta", "Rp 200M", "Q1 2026"],
    ],
    [3000, 2700, 1500, 2160],
    COLORS.indigo
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 2: SUCCESS METRICS ──────────────────────────────────────────────
const section2 = [
  sectionTitle("📊", "SECTION 2 — SUCCESS METRICS"),
  hr(),
  h("2.1  Acquisition Metrics", HeadingLevel.HEADING_2),
  table(
    ["Metric", "Definition", "Target M3", "Target M6", "Target M12"],
    [
      ["New Registrations", "Akun baru per bulan", "500", "3.000", "15.000"],
      ["Organic Growth Rate", "% user dari referral/SEO", "20%", "35%", "50%"],
      ["Cost per Acquisition", "Biaya per user baru", "Rp 8K", "Rp 5K", "Rp 3K"],
      ["App Store Rating", "Rating rata-rata", "4.5+", "4.6+", "4.8+"],
    ],
    [2200, 2800, 1400, 1400, 1560],
    COLORS.indigo
  ),
  ...spacer(1),
  h("2.2  Engagement & Retention Metrics", HeadingLevel.HEADING_2),
  table(
    ["Metric", "Definition", "Target"],
    [
      ["DAU/MAU Ratio", "Rasio pengguna harian vs bulanan", "≥ 35%"],
      ["Day-1 Retention", "User kembali esok hari", "≥ 70%"],
      ["Day-7 Retention", "User aktif setelah 7 hari", "≥ 50%"],
      ["Day-30 Retention", "User aktif setelah 30 hari", "≥ 40%"],
      ["Avg. Journal per User/Week", "Frekuensi journaling", "≥ 4 entri"],
      ["Streak Completion Rate", "% user dengan streak ≥ 7", "≥ 25%"],
      ["AI Coach Session Rate", "% user pakai AI Coach/minggu", "≥ 30%"],
      ["Session Duration", "Durasi rata-rata per sesi", "≥ 12 menit"],
    ],
    [3000, 4000, 2360],
    COLORS.violet
  ),
  ...spacer(1),
  h("2.3  Business Metrics", HeadingLevel.HEADING_2),
  table(
    ["Metric", "Definition", "Target M6", "Target M12"],
    [
      ["Free-to-Paid Conversion", "% free user upgrade Premium", "5%", "8%"],
      ["MRR", "Monthly Recurring Revenue", "Rp 25M", "Rp 200M"],
      ["Churn Rate", "% user batalkan langganan/bulan", "≤ 5%", "≤ 3%"],
      ["LTV:CAC Ratio", "Lifetime value vs acquisition cost", "3:1", "5:1"],
      ["NPS", "Net Promoter Score", "50+", "65+"],
    ],
    [2500, 3500, 1680, 1680],
    COLORS.green
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 3: USER PERSONAS ─────────────────────────────────────────────────
const section3 = [
  sectionTitle("👤", "SECTION 3 — USER PERSONAS"),
  hr(),
  table(
    ["Persona", "Profil", "Pain Points", "Jobs to be Done", "Willingness to Pay"],
    [
      [
        "🎓 Rania, 22\nMahasiswi",
        "Semester akhir, sering overthinking soal masa depan. Aktif di media sosial, tech-savvy.",
        "Sulit tidur, pikiran racing, tidak tahu cara mengelola emosi, tidak mau ke psikolog karena stigma.",
        "Mengurangi kecemasan, memahami emosi sendiri, mendapatkan validasi tanpa menghakimi.",
        "Rendah–Sedang. Budget terbatas. Tertarik jika ada diskon pelajar."
      ],
      [
        "💼 Andi, 31\nProduct Manager",
        "Karier bagus, tapi sering burnout. Sudah mencoba beberapa app wellness tapi tidak konsisten.",
        "Tidak punya waktu, merasa overwhelmed, sulit memisahkan kerja dan kehidupan pribadi.",
        "Meningkatkan self-awareness, mengelola stres kerja, membangun habits positif, produktivitas.",
        "Sedang–Tinggi. Rp 49K/bulan wajar. Butuh nilai nyata yang terbukti."
      ],
      [
        "🧑‍🏫 Sari, 38\nGuru SMA",
        "Punya anak dua, kerja penuh, penghasilan menengah. Ingin jaga kesehatan mental tapi resource terbatas.",
        "Stres double duty (kerja + keluarga), tidak ada waktu untuk diri sendiri, guilt saat me-time.",
        "Melepas emosi, mendapat apresiasi atas kerja keras, merasa didengar, journaling harian.",
        "Rendah. Hanya upgrade jika ada bukti nyata manfaat."
      ],
      [
        "🎨 Dimas, 27\nFreelancer",
        "Bekerja dari rumah, introvert, cycles of creative blocks dan overthinking.",
        "Isolasi sosial, tidak konsisten dalam rutinitas, creative blocks, mood swings, kurang motivasi.",
        "Tracking mood, menemukan pola kreativitas, komunitas yang aman, AI yang mengerti.",
        "Sedang. Rp 49K oke jika ada AI Coach. Suka fitur unik dan visual."
      ],
    ],
    [1300, 1900, 1900, 2000, 1260]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 4: USER JOURNEY ──────────────────────────────────────────────────
const section4 = [
  sectionTitle("🗺️", "SECTION 4 — USER JOURNEY MAP"),
  hr(),
  h("4.1  Onboarding to Habit Journey", HeadingLevel.HEADING_2),
  table(
    ["Stage", "Timeline", "User Action", "Emotion", "System Response", "Key Metric"],
    [
      ["Discovery", "Hari 0", "Menemukan MindBloom dari referral/ads", "😐 Penasaran", "Landing page dengan hero yang meyakinkan, social proof, CTA kuat", "Click-through rate"],
      ["Signup", "Hari 0", "Daftar via Google/Email, isi onboarding 3 pertanyaan", "😊 Antusias", "Personalisasi awal, salam dengan nama, animasi selamat datang", "Completion rate 80%"],
      ["First Journal", "Hari 1", "Menulis jurnal 15 langkah pertama", "😲 Impressed", "Guided tour, AI Insight pertama, konfetti simpan jurnal", "Day-1 retention"],
      ["Discovery Phase", "Hari 2–3", "Menjelajah Taman, AI Coach, Soundscape", "🌟 Excited", "Fitur-fitur terungkap bertahap (progressive disclosure)", "Feature adoption rate"],
      ["Habit Forming", "Hari 4–7", "Kembali menulis setiap hari, streak 7 hari", "🔥 Motivated", "Badge 7-hari, notifikasi pengingat, insight mingguan pertama", "Day-7 retention"],
      ["Deepening", "Hari 8–30", "Pakai AI Coach, eksplorasi Life Wheel, Habit Tracker", "💖 Attached", "Memory Room bulan pertama, rekomendasi AI dipersonalisasi", "Day-30 retention"],
      ["Premium Trigger", "Hari 14–30", "Menemukan batas fitur free, lihat preview Premium", "🤔 Considering", "Paywall soft dengan preview value, trial 7 hari gratis", "Trial start rate"],
      ["Loyal User", "Hari 30–90", "Upgrade Premium, gunakan hampir setiap hari", "✨ Transformed", "Insight bulanan, buku kenangan, komunitas beta", "Churn rate, LTV"],
      ["Advocate", "Hari 90+", "Refer teman, beri review 5 bintang", "🏆 Proud", "Referral rewards, badge komunitas, early access fitur baru", "NPS, viral coefficient"],
    ],
    [1000, 800, 1500, 900, 2000, 1160]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 5: FEATURE BREAKDOWN ────────────────────────────────────────────
const section5 = [
  sectionTitle("⚙️", "SECTION 5 — FEATURE BREAKDOWN"),
  hr(),
  table(
    ["Feature ID", "Feature Name", "Phase", "Priority", "Complexity", "Value Score"],
    [
      ["F-001", "Daily Journaling 15 Steps", "Phase 1", priorityCell("P0"), "High", "10/10"],
      ["F-002", "Mood Tracker & Slider", "Phase 1", priorityCell("P0"), "Medium", "9/10"],
      ["F-003", "Emotion Picker Multi-select", "Phase 1", priorityCell("P0"), "Low", "9/10"],
      ["F-004", "Gratitude Journal Dynamic", "Phase 1", priorityCell("P0"), "Low", "9/10"],
      ["F-005", "Streak & Gamification", "Phase 1", priorityCell("P0"), "Medium", "9/10"],
      ["F-006", "Auth (Google + Email)", "Phase 1", priorityCell("P0"), "Medium", "10/10"],
      ["F-007", "Dark/Light Mode", "Phase 1", priorityCell("P0"), "Low", "7/10"],
      ["F-008", "Mood Calendar Heatmap", "Phase 1", priorityCell("P1"), "Medium", "8/10"],
      ["F-009", "Achievement Badges System", "Phase 1", priorityCell("P1"), "Medium", "8/10"],
      ["F-010", "Breathing Exercise 4-4-4-4", "Phase 1", priorityCell("P1"), "Low", "8/10"],
      ["F-011", "Soundscape Premium Mixer", "Phase 2", priorityCell("P1"), "High", "8/10"],
      ["F-012", "Emotional Garden Gamification", "Phase 2", priorityCell("P1"), "Very High", "9/10"],
      ["F-013", "Life Wheel Radar Chart", "Phase 2", priorityCell("P1"), "Medium", "8/10"],
      ["F-014", "Habit Tracker + AI Correlation", "Phase 2", priorityCell("P1"), "High", "9/10"],
      ["F-015", "Analytics Dashboard Full", "Phase 2", priorityCell("P1"), "High", "8/10"],
      ["F-016", "Weekly/Monthly Insight Report", "Phase 2", priorityCell("P2"), "High", "9/10"],
      ["F-017", "AI Reflection Coach (Chat)", "Phase 3", priorityCell("P0"), "Very High", "10/10"],
      ["F-018", "Emotional Intelligence Engine", "Phase 3", priorityCell("P0"), "Very High", "10/10"],
      ["F-019", "AI Personalized Insights Daily", "Phase 3", priorityCell("P1"), "High", "9/10"],
      ["F-020", "AI Affirmation Generator", "Phase 3", priorityCell("P1"), "Medium", "8/10"],
      ["F-021", "Memory Vault Monthly Book", "Phase 4", priorityCell("P1"), "High", "9/10"],
      ["F-022", "PDF Export Reflection Book", "Phase 4", priorityCell("P2"), "Medium", "7/10"],
      ["F-023", "Annual Review AI Summary", "Phase 4", priorityCell("P2"), "High", "9/10"],
      ["F-024", "React Native iOS App", "Phase 5", priorityCell("P1"), "Very High", "10/10"],
      ["F-025", "React Native Android App", "Phase 5", priorityCell("P1"), "Very High", "10/10"],
      ["F-026", "Offline Mode + Sync", "Phase 5", priorityCell("P1"), "High", "9/10"],
      ["F-027", "Push Notifications Smart", "Phase 5", priorityCell("P1"), "Medium", "9/10"],
      ["F-028", "Free/Premium/Pro Plans", "Phase 6", priorityCell("P0"), "High", "10/10"],
      ["F-029", "Stripe/Midtrans Payment", "Phase 6", priorityCell("P0"), "Medium", "10/10"],
      ["F-030", "Referral & Reward System", "Phase 6", priorityCell("P2"), "Medium", "8/10"],
    ],
    [800, 2200, 900, 1200, 1200, 1060]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 6: EPIC BREAKDOWN ────────────────────────────────────────────────
const section6 = [
  sectionTitle("📋", "SECTION 6 — EPIC BREAKDOWN"),
  hr(),
  table(
    ["Epic ID", "Epic Name", "Phase", "Sprint(s)", "Features Covered", "Priority"],
    [
      ["EP-01", "Authentication & Onboarding", "Phase 1", "S1", "F-006 + onboarding flow", priorityCell("P0")],
      ["EP-02", "Core Daily Journal", "Phase 1", "S1–S2", "F-001, F-002, F-003, F-004", priorityCell("P0")],
      ["EP-03", "Mood & Habit Tracking", "Phase 1", "S2–S3", "F-008, F-009, F-010", priorityCell("P0")],
      ["EP-04", "Gamification System V1", "Phase 1", "S3", "F-005, F-009", priorityCell("P1")],
      ["EP-05", "UI System & Dark Mode", "Phase 1", "S1", "F-007, design system", priorityCell("P0")],
      ["EP-06", "Soundscape & Ambience", "Phase 2", "S4", "F-011", priorityCell("P1")],
      ["EP-07", "Emotional Garden", "Phase 2", "S4–S5", "F-012", priorityCell("P1")],
      ["EP-08", "Life Wheel & Habits AI", "Phase 2", "S5", "F-013, F-014", priorityCell("P1")],
      ["EP-09", "Analytics & Insights V1", "Phase 2", "S5–S6", "F-015, F-016", priorityCell("P1")],
      ["EP-10", "AI Reflection Coach", "Phase 3", "S6–S8", "F-017", priorityCell("P0")],
      ["EP-11", "Emotional Intelligence Engine", "Phase 3", "S7–S9", "F-018, F-019, F-020", priorityCell("P0")],
      ["EP-12", "Memory Vault & Export", "Phase 4", "S9–S10", "F-021, F-022, F-023", priorityCell("P1")],
      ["EP-13", "React Native Mobile App", "Phase 5", "S10–S14", "F-024, F-025, F-026, F-027", priorityCell("P1")],
      ["EP-14", "Monetization & Payments", "Phase 6", "S12–S14", "F-028, F-029, F-030", priorityCell("P0")],
    ],
    [700, 2000, 900, 900, 2500, 1360]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 7: USER STORIES ──────────────────────────────────────────────────
const section7 = [
  sectionTitle("📖", "SECTION 7 — USER STORIES & ACCEPTANCE CRITERIA"),
  hr(),
  h("Phase 1 — Core Journaling", HeadingLevel.HEADING_2, COLORS.indigo),
  ...spacer(1),

  ...storyCard(
    "US-001", "Signup dengan Google",
    "Sebagai pengguna baru, saya ingin mendaftar dengan akun Google sehingga saya bisa mulai journaling dalam 30 detik tanpa mengisi form panjang.",
    [
      "Tombol 'Lanjutkan dengan Google' tersedia di halaman signup",
      "OAuth Google berhasil dan akun dibuat otomatis",
      "Pengguna diarahkan ke onboarding setelah signup pertama",
      "Pengguna yang sudah ada diarahkan langsung ke dashboard",
      "Loading state ditampilkan selama proses auth",
    ],
    "P0", "1", "Phase 1"
  ),

  ...storyCard(
    "US-002", "Onboarding Personalisasi",
    "Sebagai pengguna baru, saya ingin mengisi 3 pertanyaan onboarding singkat sehingga pengalaman MindBloom terasa personal sejak hari pertama.",
    [
      "Maksimal 3 pertanyaan: nama, tujuan journaling, jam yang diinginkan",
      "Progress indicator tersedia (1/3, 2/3, 3/3)",
      "Data tersimpan ke profil pengguna di Supabase",
      "Salam pertama menggunakan nama yang diisi",
      "Bisa dilewati (skip) dengan default settings",
    ],
    "P0", "1", "Phase 1"
  ),

  ...storyCard(
    "US-003", "Menulis Jurnal Harian 15 Langkah",
    "Sebagai pengguna, saya ingin menulis jurnal melalui form bertahap 15 langkah sehingga setiap aspek emosi dan refleksi saya terekam dengan terstruktur.",
    [
      "15 langkah muncul satu per satu dengan animasi fade-up",
      "Step indicator menampilkan progress (1 dari 15)",
      "Semua langkah bisa diisi: mood slider, emotion picker, textarea, battery energy, gratitude list, affirmations",
      "Tombol Lanjut dan Kembali berfungsi di semua langkah",
      "Auto-save draft setiap 30 detik (localStorage + Supabase)",
      "Confetti dan toast sukses muncul saat jurnal tersimpan",
      "Jurnal tersimpan ke tabel journal_entries di Supabase",
    ],
    "P0", "1–2", "Phase 1"
  ),

  ...storyCard(
    "US-004", "Mood Slider Real-time",
    "Sebagai pengguna, saya ingin menggeser slider mood dari 1–10 dan melihat emoji berubah secara real-time sehingga saya bisa mengekspresikan perasaan dengan intuitif.",
    [
      "Slider range 1–10 dengan step 1",
      "Emoji berubah real-time (1=😭, 5=😐, 10=😍) saat slider digeser",
      "Label teks mood muncul di bawah emoji (mis. 'Baik sekali')",
      "Nilai tersimpan ke kolom mood_score di journal_entries",
      "Animasi morph emoji halus (CSS transition)",
    ],
    "P0", "2", "Phase 1"
  ),

  ...storyCard(
    "US-005", "Streak Harian",
    "Sebagai pengguna, saya ingin melihat streak harian saya sehingga saya termotivasi untuk menulis jurnal setiap hari tanpa putus.",
    [
      "Streak naik +1 jika menulis jurnal dalam hari kalender yang sama",
      "Streak reset ke 0 jika tidak ada jurnal selama 24 jam penuh",
      "Animasi api (🔥) dan angka streak di dashboard",
      "Notifikasi push jam 20:00 jika belum nulis hari ini (Phase 5)",
      "Badge milestone: 3, 7, 14, 30, 60, 90, 365 hari",
    ],
    "P0", "2–3", "Phase 1"
  ),

  ...storyCard(
    "US-006", "Mood Calendar Visual",
    "Sebagai pengguna, saya ingin melihat kalender bulanan dengan warna sesuai mood setiap hari sehingga saya bisa menangkap pola emosi dalam sebulan.",
    [
      "Kalender menampilkan bulan berjalan dengan navigasi prev/next",
      "Setiap hari yang ada jurnalnya diberi warna sesuai mood_score",
      "Warna: hijau (mood 8–10), biru (5–7), oranye (3–4), merah (1–2)",
      "Klik tanggal menampilkan preview ringkasan jurnal hari itu",
      "Legend warna tersedia di bawah kalender",
      "Hari tanpa jurnal tampil abu-abu/kosong",
    ],
    "P1", "3", "Phase 1"
  ),

  h("Phase 2 — Premium Experience", HeadingLevel.HEADING_2, COLORS.violet),
  ...spacer(1),

  ...storyCard(
    "US-007", "Soundscape Mixer",
    "Sebagai pengguna Premium, saya ingin mengaktifkan dan mencampur suara ambient (hujan, hutan, kafe) saat menulis jurnal sehingga saya masuk ke kondisi fokus dan tenang.",
    [
      "6 opsi suara tersedia: Hujan, Hutan, Laut, Kafe, Malam, Api",
      "Bisa aktifkan beberapa sekaligus dengan volume independen",
      "Slider volume per suara (0–100%)",
      "Timer: 15, 30, 45, 60 menit dengan auto-stop",
      "Fade-in/fade-out halus saat aktifkan/matikan suara",
      "State suara persisten selama sesi journaling",
      "Terkunci di balik paywall Premium (preview gratis 30 detik)",
    ],
    "P1", "4", "Phase 2"
  ),

  ...storyCard(
    "US-008", "Emotional Garden",
    "Sebagai pengguna, saya ingin melihat taman virtual yang tumbuh setiap kali saya menulis jurnal sehingga saya mendapatkan kepuasan visual atas konsistensi refleksi saya.",
    [
      "Setiap jurnal yang disimpan menambah satu tanaman ke taman",
      "Warna tanaman sesuai mood dominan jurnal (hijau=bahagia, biru=tenang, dst)",
      "Level taman: Benih → Tunas → Tanaman → Pohon → Hutan",
      "Streak mempengaruhi kecepatan pertumbuhan",
      "Jurnal dengan refleksi mendalam (step 11–12 diisi) menghasilkan bunga langka",
      "Animasi taman bergoyang-goyang halus, ada matahari dan awan",
      "Tap tanaman menampilkan jurnal yang menumbuhkannya",
    ],
    "P1", "4–5", "Phase 2"
  ),

  ...storyCard(
    "US-009", "Life Wheel Radar Chart",
    "Sebagai pengguna, saya ingin menilai 8 dimensi kehidupan saya dan melihat visualisasi radar chart sehingga saya mendapatkan gambaran utuh tentang keseimbangan hidup.",
    [
      "8 dimensi: Karier, Kesehatan, Keluarga, Keuangan, Spiritual, Hubungan, Belajar, Kebahagiaan",
      "Slider 0–100 per dimensi, chart berubah real-time",
      "AI menghasilkan analisis 2–3 kalimat tentang keseimbangan",
      "Bisa simpan snapshot bulanan untuk dibandingkan",
      "Visualisasi radar dengan gradasi warna indigo–pink",
      "Tersimpan ke tabel life_wheel_entries",
    ],
    "P1", "5", "Phase 2"
  ),

  ...storyCard(
    "US-010", "Habit Tracker + AI Correlation",
    "Sebagai pengguna, saya ingin melacak kebiasaan harian dan melihat korelasinya dengan mood sehingga saya bisa memahami apa yang benar-benar mempengaruhi kesehatan mental saya.",
    [
      "Bisa tambah custom habit dengan icon dan nama",
      "Check-in harian per habit (tap untuk selesai)",
      "Streak per habit ditampilkan",
      "AI menghitung korelasi habit vs mood_score dari data 30 hari",
      "Insight otomatis muncul jika ada korelasi signifikan (r > 0.4)",
      "Contoh insight: 'Pada hari olahraga, rata-rata mood naik 18%'",
    ],
    "P1", "5", "Phase 2"
  ),

  h("Phase 3 — AI Reflection Coach", HeadingLevel.HEADING_2, COLORS.pink),
  ...spacer(1),

  ...storyCard(
    "US-011", "AI Coach Chat Interface",
    "Sebagai pengguna, saya ingin berbicara dengan AI Coach setelah menulis jurnal sehingga saya bisa melakukan refleksi lebih dalam melalui percakapan yang empatik dan tidak menghakimi.",
    [
      "Interface chat dengan bubble pesan user (kanan) dan AI (kiri)",
      "AI Coach bernama 'Bloom' dengan avatar dan status online",
      "AI memulai dengan pertanyaan reflektif berdasarkan jurnal hari ini",
      "Minimal 4 pertanyaan follow-up yang mendorong refleksi lebih dalam",
      "Quick prompts tersedia untuk memulai percakapan",
      "AI tidak pernah memberikan saran medis atau diagnosis",
      "Riwayat chat tersimpan per jurnal di tabel coach_sessions",
      "Streaming response dengan efek mengetik (typewriter effect)",
      "Gratis 3 sesi/hari; unlimited untuk Premium",
    ],
    "P0", "6–8", "Phase 3"
  ),

  ...storyCard(
    "US-012", "Emotional Intelligence Engine",
    "Sebagai pengguna, saya ingin AI menganalisis konten jurnal saya secara otomatis sehingga saya mendapatkan insight tentang pola emosi tanpa harus memintanya.",
    [
      "Setelah jurnal disimpan, AI memproses konten secara async",
      "Deteksi 7 dimensi: stres, kecemasan, syukur, burnout, optimisme, mood, overthinking",
      "Skor emosi tersimpan ke tabel emotion_analysis",
      "Insight muncul di dashboard dalam ≤ 60 detik setelah simpan",
      "Tren emosi tersedia di halaman Analitik",
      "Rekomendasi aktivitas muncul jika stres score > 7",
      "Tidak ada PII yang dikirim ke API eksternal",
    ],
    "P0", "7–9", "Phase 3"
  ),

  h("Phase 4 — Memory Vault", HeadingLevel.HEADING_2, COLORS.amber),
  ...spacer(1),

  ...storyCard(
    "US-013", "Monthly Reflection Book",
    "Sebagai pengguna, saya ingin melihat 'buku kenangan' bulan lalu yang dikurasi AI sehingga saya bisa merayakan perjalanan emosi dan pertumbuhan saya.",
    [
      "Otomatis dihasilkan di hari pertama bulan baru",
      "Berisi: momen terbaik, pelajaran terbesar, orang paling disebut, topik syukur terbanyak, pencapaian",
      "AI menulis narasi 1–2 paragraf tentang perjalanan emosi bulan itu",
      "Tampil di halaman Memory Vault dengan desain buku cantik",
      "Bisa dibagikan sebagai gambar (share card)",
      "PDF export tersedia untuk pengguna Premium",
    ],
    "P1", "9–10", "Phase 4"
  ),

  h("Phase 5 — Mobile Apps", HeadingLevel.HEADING_2, COLORS.green),
  ...spacer(1),

  ...storyCard(
    "US-014", "Push Notification Reminder",
    "Sebagai pengguna mobile, saya ingin mendapatkan notifikasi pintar di waktu yang saya pilih sehingga saya tidak lupa menulis jurnal harian.",
    [
      "Pengguna bisa set jam reminder (default 21:00)",
      "Notifikasi tidak dikirim jika sudah nulis jurnal hari itu",
      "Notifikasi menggunakan pesan yang dipersonalisasi (nama + streak)",
      "Bisa dimatikan dari settings",
      "FCM/APNs terintegrasi via Supabase Edge Functions",
    ],
    "P1", "12–13", "Phase 5"
  ),

  h("Phase 6 — Monetization", HeadingLevel.HEADING_2, COLORS.slate),
  ...spacer(1),

  ...storyCard(
    "US-015", "Paywall & Subscription",
    "Sebagai pengguna, saya ingin bisa upgrade ke Premium dengan pembayaran yang mudah sehingga saya mendapatkan akses ke semua fitur MindBloom.",
    [
      "Pricing page menampilkan 3 paket: Gratis, Premium (Rp 49K/bln), Pro (Rp 99K/bln)",
      "Pembayaran via Midtrans (kartu, transfer bank, e-wallet)",
      "Trial 7 hari gratis untuk Premium (tidak butuh kartu kredit)",
      "Status langganan tersimpan di tabel subscriptions",
      "Fitur premium ter-unlock otomatis setelah pembayaran berhasil",
      "Email konfirmasi dan invoice otomatis terkirim",
      "Bisa cancel kapan saja dari Settings > Langganan",
    ],
    "P0", "12–14", "Phase 6"
  ),

  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 8: PRIORITY MATRIX ───────────────────────────────────────────────
const section8 = [
  sectionTitle("🎯", "SECTION 8 — PRIORITY MATRIX (ICE Score)"),
  hr(),
  p("ICE Score = Impact × Confidence × Ease. Skala 1–10. Digunakan untuk menentukan urutan pengerjaan."),
  ...spacer(1),
  table(
    ["Story ID", "Feature", "Impact", "Confidence", "Ease", "ICE", "Priority", "Phase"],
    [
      ["US-001", "Signup Google", "10", "10", "8", "800", priorityCell("P0"), "Phase 1"],
      ["US-002", "Onboarding", "9", "9", "8", "648", priorityCell("P0"), "Phase 1"],
      ["US-003", "Journal 15 Steps", "10", "9", "6", "540", priorityCell("P0"), "Phase 1"],
      ["US-004", "Mood Slider", "9", "9", "9", "729", priorityCell("P0"), "Phase 1"],
      ["US-005", "Streak System", "9", "9", "7", "567", priorityCell("P0"), "Phase 1"],
      ["US-006", "Mood Calendar", "8", "8", "7", "448", priorityCell("P1"), "Phase 1"],
      ["US-007", "Soundscape Mixer", "8", "7", "5", "280", priorityCell("P1"), "Phase 2"],
      ["US-008", "Emotional Garden", "9", "7", "4", "252", priorityCell("P1"), "Phase 2"],
      ["US-009", "Life Wheel", "8", "7", "6", "336", priorityCell("P1"), "Phase 2"],
      ["US-010", "Habit Tracker", "9", "7", "5", "315", priorityCell("P1"), "Phase 2"],
      ["US-011", "AI Coach Chat", "10", "7", "4", "280", priorityCell("P0"), "Phase 3"],
      ["US-012", "EI Engine", "10", "6", "3", "180", priorityCell("P0"), "Phase 3"],
      ["US-013", "Memory Book", "8", "7", "5", "280", priorityCell("P1"), "Phase 4"],
      ["US-014", "Push Notifications", "9", "8", "6", "432", priorityCell("P1"), "Phase 5"],
      ["US-015", "Paywall & Payment", "10", "8", "6", "480", priorityCell("P0"), "Phase 6"],
    ],
    [700, 1900, 600, 700, 600, 600, 1200, 960]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 9: SPRINT PLANNING ───────────────────────────────────────────────
const section9 = [
  sectionTitle("🏃", "SECTION 9 — SPRINT PLANNING (2 Minggu/Sprint)"),
  hr(),
  table(
    ["Sprint", "Duration", "Goal", "User Stories", "Team Focus"],
    [
      ["Sprint 1", "Minggu 1–2", "Foundation: Auth, Design System, Routing", "US-001, US-002, DS setup, DB schema", "FE + BE + Infra"],
      ["Sprint 2", "Minggu 3–4", "Core Journal V1: 15 Steps + Mood Slider", "US-003, US-004", "FE heavy"],
      ["Sprint 3", "Minggu 5–6", "Streak, Calendar, Achievements V1", "US-005, US-006", "FE + BE"],
      ["Sprint 4", "Minggu 7–8", "Soundscape + Emotional Garden V1", "US-007, US-008", "FE heavy"],
      ["Sprint 5", "Minggu 9–10", "Life Wheel, Habit Tracker, Analytics", "US-009, US-010", "FE + AI"],
      ["Sprint 6", "Minggu 11–12", "AI Coach V1 (Claude/GPT-4o integration)", "US-011 V1", "BE + AI"],
      ["Sprint 7", "Minggu 13–14", "AI Coach V2: context-aware, streamed", "US-011 V2", "BE + AI"],
      ["Sprint 8", "Minggu 15–16", "Emotional Intelligence Engine V1", "US-012 V1", "AI + BE"],
      ["Sprint 9", "Minggu 17–18", "EI Engine V2 + Memory Vault", "US-012 V2, US-013", "AI + FE"],
      ["Sprint 10", "Minggu 19–20", "Memory Book, PDF Export, Insights", "US-013 Full", "FE + BE"],
      ["Sprint 11", "Minggu 21–22", "Mobile: React Native Foundation + Auth", "US-014 setup", "Mobile"],
      ["Sprint 12", "Minggu 23–24", "Mobile: Journal + Mood + Monetization", "US-015 + mobile", "Mobile + BE"],
      ["Sprint 13", "Minggu 25–26", "Mobile: Push Notif + Offline Sync", "US-014 full", "Mobile + BE"],
      ["Sprint 14", "Minggu 27–28", "Payment Integration, Launch Prep", "US-015 full", "BE + QA"],
    ],
    [700, 1200, 2200, 2300, 1460]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 10: MILESTONE ROADMAP ────────────────────────────────────────────
const section10 = [
  sectionTitle("🗓️", "SECTION 10 — MILESTONE ROADMAP"),
  hr(),
  table(
    ["Milestone", "Target Date", "Deliverable", "Success Criteria"],
    [
      ["M1 — Private Alpha", "Feb 2025", "Core journal, auth, mood, streak. Deploy ke Vercel.", "50 beta testers, Day-7 retention ≥ 40%"],
      ["M2 — Closed Beta", "Apr 2025", "Soundscape, Garden, Life Wheel, Habit Tracker", "500 pengguna, 4 jurnal/user/minggu, NPS ≥ 40"],
      ["M3 — Public Launch Web", "Jun 2025", "AI Coach V1, Emotional Engine, Analytics Full", "5K MAU, streak avg. ≥ 5 hari, AI Coach 30% weekly users"],
      ["M4 — Premium Launch", "Aug 2025", "Paywall aktif, Midtrans, Memory Vault, PDF Export", "500 paying users, MRR Rp 25M, churn ≤ 8%"],
      ["M5 — Mobile Beta", "Oct 2025", "React Native iOS + Android beta, push notif, offline", "5K mobile installs, Day-30 mobile retention ≥ 35%"],
      ["M6 — Mobile Launch", "Dec 2025", "Full mobile launch, App Store + Play Store", "10K MAU, MRR Rp 100M, App Store rating 4.5+"],
      ["M7 — Scale", "Mar 2026", "B2B klinik, API enterprise, referral program", "25K MAU, MRR Rp 200M, NPS ≥ 65"],
    ],
    [1700, 1200, 3000, 2860 - 1200]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 11: TECHNICAL DEPENDENCY ────────────────────────────────────────
const section11 = [
  sectionTitle("🔧", "SECTION 11 — TECHNICAL DEPENDENCY MAP"),
  hr(),
  h("11.1  Technology Stack", HeadingLevel.HEADING_2),
  table(
    ["Layer", "Technology", "Purpose", "Notes"],
    [
      ["Frontend", "Next.js 15 + TypeScript", "Web app, SSR, routing", "App Router, Server Actions"],
      ["Styling", "Tailwind CSS + Shadcn/UI", "Component library, utilities", "Custom design tokens"],
      ["Animation", "Framer Motion", "Page transitions, micro-interactions", "60fps target"],
      ["State", "Zustand", "Client-side state management", "Persist middleware for offline"],
      ["Forms", "React Hook Form + Zod", "Form validation, type-safe", ""],
      ["Charts", "Recharts", "Analytics visualizations", "Responsive, accessible"],
      ["Backend", "Supabase (PostgreSQL)", "Database, auth, storage, realtime", "RLS untuk semua tabel"],
      ["Auth", "Supabase Auth", "Google OAuth + Email/Password", "JWT, refresh tokens"],
      ["AI", "OpenAI GPT-4o API", "AI Coach, Emotional Analysis", "Streaming via OpenAI SDK"],
      ["AI Framework", "LangChain.js", "Prompt management, RAG, memory", "ConversationBufferMemory"],
      ["Vector DB", "Supabase pgvector", "Semantic search jurnal", "1536-dim embeddings"],
      ["File Storage", "Supabase Storage", "PDF exports, user uploads", ""],
      ["Payments", "Midtrans", "Kartu, bank transfer, e-wallet", "Webhook untuk status"],
      ["Email", "Resend", "Transactional emails", "React Email templates"],
      ["Mobile", "React Native + Expo", "iOS & Android apps", "Expo Router v3"],
      ["Push Notif", "Expo Notifications + FCM/APNs", "Smart reminders", "Via Supabase Edge Functions"],
      ["Deployment", "Vercel (Web) + EAS (Mobile)", "CI/CD, preview deploys", ""],
      ["Monitoring", "Sentry + Vercel Analytics", "Error tracking, performance", ""],
    ],
    [1300, 2000, 2500, 2760 - 800]
  ),
  ...spacer(1),
  h("11.2  Database Schema (Core Tables)", HeadingLevel.HEADING_2),
  table(
    ["Table", "Key Columns", "Relations", "Notes"],
    [
      ["users", "id, email, name, avatar, created_at, plan", "Referenced by all tables", "Managed by Supabase Auth"],
      ["journal_entries", "id, user_id, date, mood_score, energy_score, main_story, stress_text, stress_intensity, happy_text, lesson, self_compassion, tomorrow_intent, affirmations, prayer, created_at", "FK: user_id → users", "RLS: user sees own only"],
      ["mood_logs", "id, user_id, date, mood_score, emoji, source", "FK: user_id → users", "Quick mood tanpa full journal"],
      ["emotions", "id, entry_id, emotion_tag, category, color", "FK: entry_id → journal_entries", "Multi per entry"],
      ["gratitude_items", "id, entry_id, text, order", "FK: entry_id → journal_entries", "Min 3 per entry"],
      ["streaks", "id, user_id, current_streak, longest_streak, last_entry_date", "FK: user_id → users", "Updated via trigger"],
      ["achievements", "id, user_id, badge_id, earned_at", "FK: user_id → users", ""],
      ["habits", "id, user_id, name, icon, color, created_at", "FK: user_id → users", "Custom habits"],
      ["habit_logs", "id, habit_id, user_id, date, completed", "FK: habit_id → habits", "Daily check-in"],
      ["emotion_analysis", "id, entry_id, stress_score, anxiety_score, gratitude_score, burnout_score, optimism_score, overthinking_score, ai_insight_text", "FK: entry_id → journal_entries", "Generated async by AI"],
      ["coach_sessions", "id, user_id, entry_id, messages (JSONB), created_at", "FK: user_id, entry_id", "Full chat history"],
      ["life_wheel_entries", "id, user_id, scores (JSONB), ai_analysis, created_at", "FK: user_id → users", "Monthly snapshots"],
      ["memory_books", "id, user_id, month, year, highlights (JSONB), narrative, created_at", "FK: user_id → users", "Auto-generated"],
      ["subscriptions", "id, user_id, plan, status, midtrans_token, started_at, expires_at", "FK: user_id → users", "Free / Premium / Pro"],
    ],
    [1500, 3200, 1800, 2260 - 800]
  ),
  ...spacer(1),
  h("11.3  Dependency Graph", HeadingLevel.HEADING_2),
  table(
    ["Feature", "Depends On", "Blocks"],
    [
      ["Auth (US-001)", "Supabase, Google OAuth", "Semua fitur lainnya"],
      ["Core Journal (US-003)", "Auth, users table", "Mood Calendar, Streak, AI Coach"],
      ["Mood Slider (US-004)", "Core Journal", "Mood Calendar, EI Engine"],
      ["Streak (US-005)", "Core Journal, streaks table, DB trigger", "Achievement Badges"],
      ["AI Coach (US-011)", "Core Journal, OpenAI API, coach_sessions table", "Memory Book AI narration"],
      ["EI Engine (US-012)", "Core Journal, OpenAI API, emotion_analysis table", "Analytics, Habit Correlation"],
      ["Habit Tracker (US-010)", "Auth, habits + habit_logs tables", "AI Habit Correlation"],
      ["Memory Book (US-013)", "AI Coach, EI Engine, journal_entries", "PDF Export"],
      ["Payment (US-015)", "Subscriptions table, Midtrans API", "Premium feature unlock"],
      ["Mobile App (US-014)", "Web API endpoints stable, Supabase, FCM/APNs", "Mobile-specific features"],
    ],
    [1800, 3000, 3960 - 800]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 12: RISK ANALYSIS ────────────────────────────────────────────────
const section12 = [
  sectionTitle("⚠️", "SECTION 12 — RISK ANALYSIS & MITIGATION"),
  hr(),
  table(
    ["Risk ID", "Risk Description", "Probability", "Impact", "Score", "Mitigation Strategy"],
    [
      ["R-001", "Pengguna tidak konsisten menulis jurnal (churn tinggi)", "High", "High", {text:"9/10",color:COLORS.red,bold:true}, "Notifikasi pintar, streak gamification, progressive onboarding, AI yang mempersuasi tanpa memaksa"],
      ["R-002", "OpenAI API cost meledak seiring pertumbuhan user", "Medium", "High", {text:"7/10",color:COLORS.amber,bold:true}, "Rate limiting, caching semantic, lazy AI processing (async, bukan real-time), monitor cost per user"],
      ["R-003", "Pengguna merasa AI Coach tidak cukup empatik", "Medium", "High", {text:"7/10",color:COLORS.amber,bold:true}, "Extensive prompt engineering, user testing, fallback ke pertanyaan reflektif sederhana jika konteks terbatas"],
      ["R-004", "Data privasi pengguna bocor (jurnal sangat sensitif)", "Low", "Critical", {text:"8/10",color:COLORS.red,bold:true}, "RLS di semua tabel, enkripsi at-rest, tidak kirim PII ke AI API, GDPR/PDPA compliant, audit reguler"],
      ["R-005", "Persaingan dari pemain besar (Calm, Headspace masuk journaling)", "Medium", "Medium", {text:"6/10",color:COLORS.amber,bold:true}, "Fokus pada niche Indonesia + bahasa lokal, AI yang lebih personal, harga kompetitif, komunitas"],
      ["R-006", "Kompleksitas Emotional Garden memperlambat pengembangan", "High", "Medium", {text:"6/10",color:COLORS.amber,bold:true}, "Ship versi sederhana (SVG statis) dulu, iterasi ke animasi kompleks di v2"],
      ["R-007", "App Store rejection untuk aplikasi kesehatan mental", "Low", "High", {text:"5/10",color:COLORS.amber,bold:true}, "Tambahkan disclaimer 'bukan pengganti profesional', follow App Store guidelines untuk health apps"],
      ["R-008", "Mobile sync conflict saat offline mode", "Medium", "Medium", {text:"5/10",color:COLORS.amber,bold:true}, "Last-write-wins strategy, conflict resolution UI, optimistic updates dengan rollback"],
      ["R-009", "Tim tidak cukup untuk deliver semua epics tepat waktu", "High", "High", {text:"8/10",color:COLORS.red,bold:true}, "Prioritisasi ketat P0 dulu, scope creep prevention, review sprint velocity setiap 2 minggu"],
      ["R-010", "Monetisasi terlambat membuat cashflow negatif", "Medium", "High", {text:"7/10",color:COLORS.amber,bold:true}, "Launch Premium di M4 (bukan M6), pre-sell lifetime plan, seek investor/grant di M3"],
    ],
    [600, 2400, 800, 700, 700, 3360 - 560]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 13: API DESIGN ───────────────────────────────────────────────────
const section13 = [
  sectionTitle("🌐", "SECTION 13 — API DESIGN"),
  hr(),
  h("13.1  REST API Endpoints", HeadingLevel.HEADING_2),
  table(
    ["Method", "Endpoint", "Auth", "Description", "Response"],
    [
      ["POST", "/api/auth/callback", "Public", "OAuth callback handler", "Redirect + session cookie"],
      ["GET", "/api/journals", "Required", "List jurnal milik user (pagination)", "{ data: JournalEntry[], count }"],
      ["POST", "/api/journals", "Required", "Buat jurnal baru", "{ data: JournalEntry }"],
      ["GET", "/api/journals/:id", "Required", "Ambil jurnal by ID", "{ data: JournalEntry }"],
      ["PATCH", "/api/journals/:id", "Required", "Update jurnal (auto-save)", "{ data: JournalEntry }"],
      ["DELETE", "/api/journals/:id", "Required", "Hapus jurnal", "{ success: true }"],
      ["GET", "/api/mood/calendar", "Required", "Mood per hari bulan ini", "{ data: MoodCalDay[] }"],
      ["GET", "/api/streak", "Required", "Current + longest streak", "{ current, longest, lastDate }"],
      ["POST", "/api/ai/coach", "Required", "Send message ke AI Coach", "Streaming SSE response"],
      ["GET", "/api/ai/insights/daily", "Required", "AI insight hari ini", "{ insight: string, scores: EIScores }"],
      ["GET", "/api/analytics/weekly", "Required", "Data analitik 7 hari", "{ mood[], stress[], energy[] }"],
      ["GET", "/api/life-wheel", "Required", "Life wheel terbaru", "{ data: LifeWheelEntry }"],
      ["POST", "/api/life-wheel", "Required", "Simpan life wheel baru", "{ data: LifeWheelEntry }"],
      ["GET", "/api/habits", "Required", "Semua habits user", "{ data: Habit[] }"],
      ["POST", "/api/habits/:id/log", "Required", "Check-in habit hari ini", "{ data: HabitLog }"],
      ["GET", "/api/memory-books", "Required", "Daftar memory book", "{ data: MemoryBook[] }"],
      ["POST", "/api/payments/create", "Required", "Buat transaksi Midtrans", "{ token, redirect_url }"],
      ["POST", "/api/payments/webhook", "Public + signature check", "Terima notifikasi Midtrans", "{ status: 'ok' }"],
    ],
    [700, 2000, 1000, 2500, 2160 - 400]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 14: BUSINESS MODEL ───────────────────────────────────────────────
const section14 = [
  sectionTitle("💰", "SECTION 14 — BUSINESS MODEL & MONETIZATION"),
  hr(),
  table(
    ["Feature", "Free", "Premium (Rp 49K/bln)", "Pro (Rp 99K/bln)"],
    [
      ["Jurnal Harian 15 Langkah", "✓ Unlimited", "✓ Unlimited", "✓ Unlimited"],
      ["Mood Tracker & Calendar", "✓", "✓", "✓"],
      ["Streak & Basic Achievements", "✓", "✓", "✓"],
      ["Breathing Exercise", "✓", "✓", "✓"],
      ["Emotional Garden", "Benih saja", "✓ Full", "✓ Full + rare flowers"],
      ["Soundscape", "1 suara, 15 mnt", "✓ 6 suara + mixer", "✓ Unlimited"],
      ["AI Coach Chat", "3 sesi/hari", "✓ Unlimited", "✓ Unlimited + memory"],
      ["AI Daily Insights", "✗", "✓ Harian", "✓ Harian + prediktif"],
      ["Analytics Dashboard", "7 hari", "✓ 90 hari", "✓ All-time"],
      ["Life Wheel + AI Analysis", "✗", "✓", "✓ + quarterly review"],
      ["Habit Tracker + Correlation", "3 habits", "✓ Unlimited", "✓ + AI rekomendasi"],
      ["Memory Book Bulanan", "✗", "✓", "✓ + share card"],
      ["PDF Export", "✗", "✓", "✓"],
      ["Offline Mode (Mobile)", "✗", "✓", "✓"],
      ["Priority Support", "Email", "Email dalam 24 jam", "Live chat + dedicated"],
      ["Custom Prompts AI", "✗", "✗", "✓"],
      ["API Access", "✗", "✗", "✓ (untuk klinik)"],
    ],
    [2500, 2000, 2430, 2430]
  ),
  ...spacer(1),
  h("14.1  Revenue Projections", HeadingLevel.HEADING_2),
  table(
    ["Month", "MAU", "Paid Users", "Premium Mix", "Pro Mix", "MRR Est."],
    [
      ["M3 (Jun '25)", "1.000", "50", "40 × Rp49K", "10 × Rp99K", "Rp 2,95 juta"],
      ["M4 (Aug '25)", "3.000", "200", "160 × Rp49K", "40 × Rp99K", "Rp 11,8 juta"],
      ["M6 (Oct '25)", "7.000", "560", "450 × Rp49K", "110 × Rp99K", "Rp 32 juta"],
      ["M8 (Dec '25)", "12.000", "1.080", "870 × Rp49K", "210 × Rp99K", "Rp 63 juta"],
      ["M12 (Apr '26)", "25.000", "2.750", "2.200 × Rp49K", "550 × Rp99K", "Rp 162 juta"],
    ],
    [1200, 1000, 1100, 1500, 1500, 2160 - 300]
  ),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── SECTION 15: FOLDER STRUCTURE ─────────────────────────────────────────────
const section15 = [
  sectionTitle("📁", "SECTION 15 — PROJECT STRUCTURE"),
  hr(),
  h("15.1  Next.js Web App", HeadingLevel.HEADING_2),
  new Paragraph({
    spacing: { before: 80, after: 160 },
    children: [new TextRun({
      text:
`mindbloom-web/
├── app/
│   ├── (auth)/           # Login, signup, onboarding
│   ├── (dashboard)/      # Dashboard, journal, analytics
│   ├── (premium)/        # Soundscape, garden, AI coach
│   ├── api/              # Route handlers (REST API)
│   └── layout.tsx
├── components/
│   ├── ui/               # Shadcn components
│   ├── journal/          # JournalForm, StepCard, MoodSlider
│   ├── dashboard/        # Widgets, heatmap, streak
│   ├── garden/           # EmotionalGarden, PlantSVG
│   ├── ai/               # CoachChat, InsightCard
│   ├── analytics/        # Charts, LineChart, DonutChart
│   └── shared/           # Button, Card, Modal, Toast
├── lib/
│   ├── supabase/         # Client, server, middleware
│   ├── ai/               # OpenAI client, prompts, streaming
│   ├── hooks/            # useJournal, useMood, useStreak
│   └── utils/            # Formatters, validators
├── store/                # Zustand stores
├── types/                # TypeScript interfaces
├── styles/               # Tailwind config, tokens
└── middleware.ts          # Auth protection`,
      font: "Courier New", size: 18, color: COLORS.dark
    })]
  }),
  ...spacer(1),
  new Paragraph({ children: [new PageBreak()] }),
];

// ─── CLOSING / APPENDIX ───────────────────────────────────────────────────────
const closing = [
  sectionTitle("🌱", "APPENDIX — DEFINITION OF DONE & WORKING AGREEMENTS"),
  hr(),
  h("Definition of Done (DoD) — Per Story", HeadingLevel.HEADING_2),
  num("Kode di-review oleh minimal 1 developer lain (PR review)."),
  num("Unit test coverage ≥ 80% untuk logika bisnis kritis."),
  num("Lulus QA testing di Chrome, Safari, Firefox (web); iOS 16+, Android 12+ (mobile)."),
  num("Tidak ada error di Sentry dalam 24 jam setelah deploy ke staging."),
  num("Acceptance criteria semua terpenuhi dan diverifikasi oleh PO."),
  num("Dokumentasi API diupdate jika ada endpoint baru."),
  num("Performa: Lighthouse score ≥ 85 untuk mobile."),
  ...spacer(1),
  h("Working Agreements", HeadingLevel.HEADING_2),
  bullet("Sprint Planning: Senin pagi, 2 jam."),
  bullet("Daily Standup: Setiap hari kerja, 15 menit, async di Slack jika remote."),
  bullet("Sprint Review: Jumat akhir sprint, demo ke stakeholder."),
  bullet("Retrospective: Jumat akhir sprint, 1 jam."),
  bullet("Branching: main (production) → develop → feature/US-XXX → hotfix/XXX."),
  bullet("PR description wajib include: link story, screenshot/video, testing steps."),
  bullet("Estimasi: Story points Fibonacci (1, 2, 3, 5, 8, 13). Max 8 per story."),
  bullet("Velocity target: 40–60 story points per sprint (team 4 orang)."),
  ...spacer(2),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 40 },
    children: [new TextRun({ text: "🌱  MindBloom — Grow Every Day  🌱", font: "Arial", size: 28, bold: true, color: COLORS.indigo })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: "Product Specification v2.0 · Confidential · May 2025", font: "Arial", size: 18, italic: true, color: COLORS.slate })]
  }),
];

// ─── ASSEMBLE DOCUMENT ────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 240 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 840, hanging: 240 } } } },
      ]},
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 240 } } } },
      ]},
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 40, bold: true, font: "Arial", color: COLORS.dark },
        paragraph: { spacing: { before: 480, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: COLORS.indigo },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: COLORS.violet },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.indigo, space: 1 } },
          spacing: { before: 0, after: 120 },
          children: [
            new TextRun({ text: "🌱 MindBloom — Product Specification & Engineering Backlog  v2.0", font: "Arial", size: 18, color: COLORS.indigo }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.indigo, space: 1 } },
          spacing: { before: 120, after: 0 },
          tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
          children: [
            new TextRun({ text: "Confidential · May 2025   \t", font: "Arial", size: 16, color: COLORS.slate }),
            new TextRun({ children: [new SimpleField("PAGE")], font: "Arial", size: 16, color: COLORS.indigo }),
          ]
        })]
      })
    },
    children: [
      ...coverPage,
      ...section1, ...section2, ...section3, ...section4,
      ...section5, ...section6, ...section7, ...section8,
      ...section9, ...section10, ...section11, ...section12,
      ...section13, ...section14, ...section15,
      ...closing,
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/mnt/user-data/outputs/MindBloom_Product_Spec_v2.docx', buf);
  console.log('✅ Done: MindBloom_Product_Spec_v2.docx');
}).catch(e => { console.error(e); process.exit(1); });
