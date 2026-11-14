/* KOOK dashboard — Crew A, November 2026
 * Data: ../data/calendar/events.csv, ../data/crew/A_hotdata.csv,
 *       ../data/biomarker/biomarker.csv, ../data/health_instruction/health_instruction.csv
 */
(() => {
'use strict';

const ROOT = '..';
const PATHS = {
  events: `${ROOT}/data/calendar/events.csv`,
  crewA: `${ROOT}/data/crew/A_hotdata.csv`,
  rules: `${ROOT}/data/biomarker/biomarker.csv`,
  instr: `${ROOT}/data/health_instruction/health_instruction.csv`,
};
const IMG = {
  A: `${ROOT}/assets/image/A_profile.png`,
  B: `${ROOT}/assets/image/B_profile.png`,
  C: `${ROOT}/assets/image/C_profile.png`,
  D: `${ROOT}/assets/image/D_profile.png`,
  doctor: `${ROOT}/assets/image/doctor_profile.png`,
  logoYellow: `${ROOT}/assets/logo/Logo_yellow%20ver..png`,
  earth: `${ROOT}/assets/background/Background_Earth.jpeg`,
  mars: `${ROOT}/assets/background/Background_Mars.jpeg`,
};
const MISSION_START = '2026-10-01';
const DATA_FIRST = '2026-11-01';
const DATA_LAST = '2026-11-30';
const TODAY = '2026-11-14';
const CREWS = ['A', 'B', 'C', 'D'];
const HAZARDS = [
  { key: 'radiation', label: 'Radiation', code: 'H1' },
  { key: 'isolation', label: 'Isolation', code: 'H2' },
  { key: 'distance', label: 'Distance', code: 'H3' },
  { key: 'gravity', label: 'Gravity', code: 'H4' },
  { key: 'habitat', label: 'Habitat', code: 'H5' },
];
const SEV = { urgent: 3, potential: 2, normal: 1, nodata: 0 };
const SEV_LABEL = { urgent: 'Urgent', potential: 'Potential', normal: 'Normal', nodata: 'No data' };
const FRIENDLY = {
  'Total Sleep Time': 'Time asleep',
  'Sleep Efficiency': 'Sleep efficiency',
  'Wake After Sleep Onset': 'Awake during the night',
  'Self-reported sleep quality': 'How well you felt you slept',
  'Self-reported sleep duration': 'Self-reported sleep duration',
  'Sleep Latency': 'Time to fall asleep',
  'Sleep Onset/Offset': 'Sleep onset/offset shift',
  'Blood Urea Nitrogen': 'BUN',
  'RBC/HPF': 'Urine occult blood / RBC',
  'UACR': 'Urine albumin (UACR)',
  'Blood Pressure (SBP)': 'Blood pressure (systolic)',
  'Blood Pressure (DBP)': 'Blood pressure (diastolic)',
};
const SLEEP_CORE = ['Self-reported sleep quality', 'Total Sleep Time', 'Sleep Efficiency', 'Wake After Sleep Onset'];

/* ---------------- utils ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const DAY_MS = 86400000;
const toD = (s) => new Date(s + 'T00:00:00Z');
const fromD = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => fromD(new Date(toD(s).getTime() + n * DAY_MS));
const missionDay = (s) => Math.round((toD(s) - toD(MISSION_START)) / DAY_MS) + 1;
const dayLabel = (s) => `DAY ${String(missionDay(s)).padStart(3, '0')}`;
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (s) => { const d = toD(s); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
const shortDate = (s) => { const d = toD(s); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const weekday = (s) => WDL[toD(s).getUTCDay()];
const weekStart = (s) => { const dow = (toD(s).getUTCDay() + 6) % 7; return addDays(s, -dow); };
const clampData = (s) => (s < DATA_FIRST ? DATA_FIRST : s > DATA_LAST ? DATA_LAST : s);
const nice = (b) => FRIENDLY[b] || b;
const store = {
  get(k, d) { try { const v = localStorage.getItem('kook.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('kook.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/* ---------------- threshold rules ---------------- */
function parseRule(str) {
  if (!str || /B-?2SD/i.test(str)) return null;
  const parts = str.split(/\s+OR\s+/i).map((p) => {
    const t = p.replace(/,/g, '').trim();
    let m = t.match(/^(<=|>=|<|>|≤|≥)\s*(-?\d+(?:\.\d+)?)/);
    if (m) { const op = { '≤': '<=', '≥': '>=' }[m[1]] || m[1]; return { op, v: +m[2] }; }
    m = t.match(/^(-?\d+(?:\.\d+)?)\s*[–—-]\s*(-?\d+(?:\.\d+)?)/);
    if (m) return { op: 'range', lo: +m[1], hi: +m[2] };
    return null;
  }).filter(Boolean);
  return parts.length ? parts : null;
}
const test1 = (p, v) => p.op === 'range' ? v >= p.lo && v <= p.hi : p.op === '<' ? v < p.v : p.op === '<=' ? v <= p.v : p.op === '>' ? v > p.v : v >= p.v;
const matches = (rule, v) => rule.some((p) => test1(p, v));

/* ---------------- data model ---------------- */
const DB = { events: [], rules: {}, info: {}, series: {}, daily: {}, continuous: new Set(), bios: [] };

function statusOf(b, v) {
  if (v == null || Number.isNaN(v)) return 'nodata';
  const r = DB.rules[b];
  if (!r) return 'normal';
  if (r.red && matches(r.red, v)) return 'urgent';
  if (r.yellow) return matches(r.yellow, v) ? 'normal' : 'potential';
  return 'normal';
}
function unitOf(b) {
  let u = (DB.rules[b] && DB.rules[b].unit) || (DB.info[b] && DB.info[b].unit) || '';
  if (u === 'm') u = 'min';
  if (b === 'RBC/HPF') u = '/HPF';
  if (b === 'WBC' || b === 'Platelets') u = '×10⁹/L';
  if (/self-reported sleep quality|mood|team cohesion|habitability/i.test(b)) u = '/10';
  if (b === 'Self-reported sleep duration') u = 'h';
  return u;
}
function fmt(v, b) {
  if (v == null) return '—';
  if (b === 'Sleep Onset/Offset' || /min/.test(unitOf(b))) return Math.round(v).toString();
  const a = Math.abs(v);
  if (Number.isInteger(v)) return String(v);
  return a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2).replace(/0$/, '');
}
const fmtU = (v, b) => { const u = unitOf(b); return `${fmt(v, b)}${u ? (u.startsWith('/') || u === '%' ? '' : ' ') + u : ''}`; };

function buildModel(raw) {
  DB.events = raw.events.map((e) => ({
    ...e,
    crews: e.crew.split(',').map((s) => s.trim()),
    hazards: e.hazard.split(',').map((s) => s.trim()).filter(Boolean).map((h) => (h === 'hostile' ? 'habitat' : h)),
  }));
  raw.rules.forEach((r) => { DB.rules[r.biomarker] = { yellow: parseRule(r.yellow), red: parseRule(r.red), yellowRaw: r.yellow, redRaw: r.red, unit: r.unit, yi: r.yellow_instruction, ri: r.red_instruction }; });
  raw.instr.forEach((r) => {
    DB.info[r.biomarker] = {
      ...r,
      summary: (r.summary || '').replace(/(\d)\?(\d)/g, '$1–$2'),
      hazards: (r.hazard || '').split(',').map((s) => s.trim()).filter(Boolean),
    };
  });
  const s = {};
  raw.crewA.forEach((r) => {
    const v = parseFloat(r.figure);
    if (!r.biomarker || Number.isNaN(v)) return;
    (s[r.biomarker] = s[r.biomarker] || []).push({ date: r.date, time: r.time, v });
  });
  Object.entries(s).forEach(([b, arr]) => {
    arr.sort((a, z) => (a.date + a.time).localeCompare(z.date + z.time));
    DB.series[b] = arr;
    if (arr.length > 200) {
      DB.continuous.add(b);
      const by = {};
      arr.forEach((p) => {
        const d = (by[p.date] = by[p.date] || { sum: 0, n: 0, min: Infinity, max: -Infinity, red: 0, flag: 0 });
        d.sum += p.v; d.n++; d.min = Math.min(d.min, p.v); d.max = Math.max(d.max, p.v);
        const st = statusOf(b, p.v); if (st === 'urgent') d.red++; if (st !== 'normal') d.flag++;
      });
      Object.values(by).forEach((d) => { d.mean = d.sum / d.n; });
      DB.daily[b] = by;
    }
  });
  DB.bios = Object.keys(DB.series);
}

/** Latest reading at or before a date. Continuous markers use that day's mean. */
function valueAt(b, date) {
  if (DB.continuous.has(b)) {
    const d = DB.daily[b][date];
    if (!d) return null;
    const last = DB.series[b].filter((p) => p.date === date).pop();
    return { v: d.mean, date, time: last ? last.time : '23:55', n: d.n, red: d.red, flag: d.flag, min: d.min, max: d.max };
  }
  const arr = DB.series[b]; let hit = null;
  for (const p of arr) { if (p.date <= date) hit = p; else break; }
  return hit;
}
/** One point per day up to date (daily mean for continuous). */
function dailyPoints(b, upto, from = DATA_FIRST) {
  if (DB.continuous.has(b)) {
    return Object.keys(DB.daily[b]).sort().filter((d) => d <= upto && d >= from).map((d) => ({ date: d, v: DB.daily[b][d].mean }));
  }
  const by = {};
  DB.series[b].forEach((p) => { if (p.date <= upto && p.date >= from) by[p.date] = p.v; });
  return Object.keys(by).sort().map((d) => ({ date: d, v: by[d] }));
}
function bioState(b, date) {
  const r = valueAt(b, date);
  const info = DB.info[b] || {};
  const st = r ? statusOf(b, r.v) : 'nodata';
  const pts = dailyPoints(b, date);
  const flagged = pts.filter((p) => statusOf(b, p.v) !== 'normal').length;
  return {
    b, name: nice(b), r, v: r ? r.v : null, status: st, info,
    category: info.category || 'Other', method: info.method || '', period: info.period || '', hazards: info.hazards || [],
    pts, flagged,
  };
}
function allStates(date) {
  return DB.bios.map((b) => bioState(b, date)).sort((a, z) => SEV[z.status] - SEV[a.status] || a.name.localeCompare(z.name));
}
function instructionFor(s) {
  const r = DB.rules[s.b] || {}; const i = s.info || {};
  if (s.status === 'urgent') return i.red_instruction || r.ri || 'Notify the flight medical officer.';
  if (s.status === 'potential') return i.yellow_instruction || r.yi || 'Review this result with the flight medical officer.';
  if (s.status === 'nodata') return 'No reading has been recorded yet for this period.';
  return 'Within your normal range. Keep your current routine.';
}
function hazardStatus(states) {
  return HAZARDS.map((h) => {
    const hits = states.filter((s) => s.hazards.includes(h.key) && (s.status === 'urgent' || s.status === 'potential'));
    const worst = hits.reduce((m, s) => (SEV[s.status] > SEV[m] ? s.status : m), 'normal');
    return { ...h, status: worst, hits };
  });
}
const eventsFor = (crew, date) => DB.events.filter((e) => e.date === date && e.crews.includes(crew)).sort((a, z) => a.start_time.localeCompare(z.start_time));

/* ---------------- chat + notes (localStorage, shared between roles) ---------------- */
function seedChat() {
  const tst = valueAt('Total Sleep Time', '2026-11-13');
  const h = tst ? fmt(tst.v, 'Total Sleep Time') : '7.4';
  return [
    { from: 'crew', date: '2026-11-13', time: '12:13', text: `I slept ${h} hours last night and still feel tired. Could you check my sleep record?`, attach: `Sleep check · ${dayLabel('2026-11-13')}` },
    { from: 'doctor', date: '2026-11-13', time: '12:25', text: "Thanks for sharing your record. I've received it. Please tell me how you're feeling now." },
    { from: 'crew', date: '2026-11-13', time: '12:30', text: "I'm still feeling tired. I've opened the saved sleep guidance." },
  ];
}
const chat = () => store.get('chatA', null) || seedChat();
function sendChat(from, text, attach) {
  text = text.trim(); if (!text) return;
  const now = new Date();
  const msgs = chat();
  msgs.push({ from, date: state.date, time: now.toISOString().slice(11, 16), text, attach });
  store.set('chatA', msgs);
}
const notes = () => store.get('notesA', []);
const libExtra = () => store.get('library', []);

/* ---------------- charts ---------------- */
const ZC = { urgent: '#FDE7DF', potential: '#F4FFB0', normal: '#E2F3E8' };
const ZL = { urgent: '#E43700', potential: '#C27400', normal: '#1B7F5A' };
function zoneBands(b, lo, hi, n = 80) {
  const out = []; const step = (hi - lo) / n;
  for (let i = 0; i < n; i++) {
    const a = lo + i * step, z = a + step, st = statusOf(b, (a + z) / 2);
    const last = out[out.length - 1];
    if (last && last.st === st) last.hi = z; else out.push({ st, lo: a, hi: z });
  }
  return out;
}
function lineChart(b, pts, { w = 560, h = 240, zones = true, axis = true, labels = true, compact = false } = {}) {
  if (!pts.length) return '<div class="empty">No readings yet.</div>';
  const pad = compact ? { l: 4, r: 4, t: 6, b: 4 } : { l: 40, r: labels ? 96 : 12, t: 12, b: 26 };
  const vs = pts.map((p) => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  const r = DB.rules[b];
  if (zones && r) {
    const ths = [...(r.yellow || []), ...(r.red || [])].flatMap((p) => (p.op === 'range' ? [p.lo, p.hi] : [p.v]));
    const near = ths.filter((t) => t >= lo - (hi - lo) * 1.2 - 1 && t <= hi + (hi - lo) * 1.2 + 1);
    if (near.length) { lo = Math.min(lo, ...near); hi = Math.max(hi, ...near); }
  }
  const span = hi - lo || Math.abs(hi) * 0.1 || 1; lo -= span * 0.12; hi += span * 0.12;
  const X = (i) => pad.l + (pts.length === 1 ? (w - pad.l - pad.r) / 2 : (i / (pts.length - 1)) * (w - pad.l - pad.r));
  const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  let g = '';
  if (zones && r) {
    zoneBands(b, lo, hi).forEach((z) => {
      g += `<rect x="${pad.l}" y="${Y(z.hi)}" width="${w - pad.l - pad.r}" height="${Math.max(0, Y(z.lo) - Y(z.hi))}" fill="${ZC[z.st]}"/>`;
      if (labels && !compact && Y(z.lo) - Y(z.hi) > 16) {
        g += `<line x1="${w - pad.r + 8}" x2="${w - pad.r + 8}" y1="${Y(z.hi) + 2}" y2="${Y(z.lo) - 2}" stroke="${ZL[z.st]}" stroke-width="2"/>`;
        g += `<text x="${w - pad.r + 14}" y="${(Y(z.hi) + Y(z.lo)) / 2 + 4}" font-size="10.5" font-weight="600" fill="${ZL[z.st]}">${SEV_LABEL[z.st]} zone</text>`;
      }
    });
  } else if (!compact) {
    g += `<rect x="${pad.l}" y="${pad.t}" width="${w - pad.l - pad.r}" height="${h - pad.t - pad.b}" fill="#F8F9FC"/>`;
  }
  if (axis && !compact) {
    for (let i = 0; i <= 3; i++) {
      const v = lo + ((hi - lo) * i) / 3;
      g += `<text x="${pad.l - 6}" y="${Y(v) + 3}" font-size="9.5" fill="#9CA7B8" text-anchor="end">${fmt(v, b)}</text>`;
    }
    const idx = [...new Set([0, Math.floor((pts.length - 1) / 3), Math.floor((2 * (pts.length - 1)) / 3), pts.length - 1])];
    idx.forEach((i) => { g += `<text x="${X(i)}" y="${h - 8}" font-size="9.5" fill="#9CA7B8" text-anchor="middle">${pts[i].label || dayLabel(pts[i].date)}</text>`; });
  }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  if (compact) {
    const area = `${d}L${X(pts.length - 1)},${h}L${X(0)},${h}Z`;
    g += `<path d="${area}" fill="url(#gfill)" opacity=".7"/>`;
  }
  g += `<path d="${d}" fill="none" stroke="#0B214F" stroke-width="${compact ? 1.6 : 1.8}" stroke-linejoin="round"/>`;
  pts.forEach((p, i) => {
    const st = statusOf(b, p.v);
    const show = !compact ? pts.length < 60 || st !== 'normal' || i === pts.length - 1 : st !== 'normal' || i === pts.length - 1;
    if (show) g += `<circle cx="${X(i)}" cy="${Y(p.v)}" r="${i === pts.length - 1 ? 4 : compact ? 2.2 : 3}" fill="${st === 'normal' ? '#0B214F' : ZL[st]}" data-tip="${esc(`${p.label || dayLabel(p.date)} · ${fmtU(p.v, b)} · ${SEV_LABEL[st]}`)}"/>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="none" style="display:block;max-height:${h}px" role="img" aria-label="${esc(nice(b))} trend">
    <defs><linearGradient id="gfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#A8C8FF" stop-opacity=".55"/><stop offset="1" stop-color="#A8C8FF" stop-opacity="0"/></linearGradient></defs>${g}</svg>`;
}
const spark = (b, pts, h = 46) => lineChart(b, pts, { w: 220, h, compact: true, zones: false });

function donut(hz, center, size = 230) {
  const C = size / 2, R = size * 0.34, T = size * 0.1;
  const col = { urgent: '#E43700', potential: '#EAFE07', normal: '#A8C8FF' };
  const arc = (a0, a1, r) => {
    const p = (a) => [C + r * Math.cos((a * Math.PI) / 180), C + r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0},${y0}A${r},${r} 0 0 1 ${x1},${y1}`;
  };
  let g = `<circle cx="${C}" cy="${C}" r="${R + T * 0.95}" fill="none" stroke="#E3E8F1" stroke-dasharray="2 4"/>`;
  hz.forEach((h, i) => {
    const a0 = -90 + i * 72 + 3, a1 = a0 + 66;
    g += `<path d="${arc(a0, a1, R)}" fill="none" stroke="${col[h.status]}" stroke-width="${T}" data-tip="${esc(`${h.label}: ${h.hits.length ? h.hits.map((s) => s.name).join(', ') : 'all normal'}`)}"/>`;
    const mid = ((a0 + a1) / 2) * (Math.PI / 180);
    g += `<text x="${C + R * Math.cos(mid)}" y="${C + R * Math.sin(mid) + 3}" font-size="${size * 0.04}" font-weight="700" text-anchor="middle" fill="${h.status === 'urgent' ? '#fff' : '#07173F'}">${h.code}</text>`;
  });
  g += `<circle cx="${C}" cy="${C}" r="${R - T * 0.75}" fill="#07173F"/>`;
  g += center;
  return { svg: g, C, R, T };
}
function hazardBoard(states, size = 250) {
  const hz = hazardStatus(states);
  const toCheck = states.filter((s) => s.status === 'urgent' || s.status === 'potential').length;
  const { svg, C, R, T } = donut(hz, '', size);
  const center = `<text x="${C}" y="${C + 4}" font-size="${size * 0.11}" font-weight="700" text-anchor="middle" fill="#EAFE07">${toCheck}</text>
    <text x="${C}" y="${C + size * 0.07}" font-size="${size * 0.032}" font-weight="600" text-anchor="middle" fill="#fff" letter-spacing=".5">TO CHECK</text>`;
  const W = size + 220, OX = 110;
  let labels = '';
  hz.forEach((h, i) => {
    const mid = ((-90 + i * 72 + 36) * Math.PI) / 180;
    const rr = R + T + 24;
    const x = OX + C + rr * Math.cos(mid), y = C + rr * Math.sin(mid);
    const anchor = Math.cos(mid) > 0.3 ? 'start' : Math.cos(mid) < -0.3 ? 'end' : 'middle';
    const sub = h.hits.length ? h.hits.slice(0, 2).map((s) => s.name).join(' · ') : 'All normal';
    const subCol = h.status === 'urgent' ? '#E43700' : h.status === 'potential' ? '#5A6300' : '#9CA7B8';
    labels += `<text x="${x}" y="${y - 3}" font-size="13" font-weight="700" text-anchor="${anchor}" fill="#07173F" style="font-family:var(--display)">${h.label}</text>
      <text x="${x}" y="${y + 12}" font-size="10.5" text-anchor="${anchor}" fill="${subCol}" ${h.status !== 'normal' ? 'text-decoration="underline"' : ''}>${esc(sub.length > 30 ? sub.slice(0, 29) + '…' : sub)}</text>`;
  });
  return `<svg class="donut" viewBox="0 -28 ${W} ${size + 64}" width="100%" style="max-width:${W}px"><g transform="translate(${OX},0)">${svg}${center}</g>${labels}</svg>`;
}
function miniDonut(states, letter, img) {
  const size = 96;
  const hz = states ? hazardStatus(states) : HAZARDS.map((h) => ({ ...h, status: 'normal', hits: [] }));
  const { svg, C } = donut(hz, '', size);
  const inner = img
    ? `<clipPath id="clip${letter}"><circle cx="${C}" cy="${C}" r="${size * 0.22}"/></clipPath><image href="${img}" x="${C - size * 0.22}" y="${C - size * 0.22}" width="${size * 0.44}" height="${size * 0.44 * 1.33}" preserveAspectRatio="xMidYMin slice" clip-path="url(#clip${letter})"/>`
    : `<text x="${C}" y="${C + 6}" font-size="18" font-weight="700" text-anchor="middle" fill="#EAFE07">${letter}</text>`;
  return `<svg viewBox="0 0 ${size} ${size}" width="84" height="84">${svg.replace(/<text[^>]*>H\d<\/text>/g, '')}${inner}</svg>`;
}

/* ---------------- state + routing ---------------- */
const state = {
  date: store.get('date', TODAY),
  week: null,
  hazardFilter: 'all',
  instrFilter: 'all',
  attFilter: 'all',
  query: '',
  libFilter: 'all',
  libQuery: '',
  bioCat: 'All',
  carousel: 0,
  docCrew: 'A',
};
state.week = weekStart(state.date);
const setDate = (d) => { state.date = clampData(d); state.week = weekStart(state.date); store.set('date', state.date); };

function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { parts, qs: new URLSearchParams(qs || '') };
}
const go = (h) => { location.hash = h; };

/* ---------------- shell ---------------- */
function topbar(role, active) {
  const crew = role === 'crew';
  const base = crew ? '#/crew' : '#/doctor';
  const now = new Date();
  const utc = `${state.date} ${now.toISOString().slice(11, 19)}`;
  return `<header class="topbar">
    <a class="logo" href="${base}" aria-label="KOOK home"><img src="${IMG.logoYellow}" alt="KOOK"></a>
    <nav>
      <a href="${base}" class="${active === 'home' ? 'active' : ''}">${crew ? 'My Calendar' : 'Crew Calendar'}</a>
      <a href="${base}/instructions" class="${active === 'instr' ? 'active' : ''}">Health Instruction</a>
    </nav>
    <span class="spacer"></span>
    <span class="meta" id="clock">UTC ${utc}</span>
    <span class="meta">SOL ${String(missionDay(state.date)).padStart(3, '0')}</span>
    <a class="role-pill" href="${crew ? '#/doctor' : '#/crew'}" title="Switch role">${crew ? 'SPACE / Astronaut' : 'EARTH / Doctor'} ⇄</a>
    <a class="profile-link ${active === 'profile' ? 'active' : ''}" href="${base}/profile">Profile</a>
  </header>`;
}
function fab(role) {
  const crew = role === 'crew';
  const icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const msgs = chat(); const last = msgs[msgs.length - 1];
  const unread = last && last.from !== role ? '<span class="unread">1</span>' : '';
  $('#fab-root').innerHTML = `<a class="fab" href="${crew ? '#/crew/chat' : '#/doctor/chat'}">${icon}${crew ? 'Ground Doctor' : 'Crew conversation'}${unread}</a>`;
}
function iconDoc(size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#EAFE07" stroke-width="2" stroke-linecap="round"><path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/></svg>`;
}

/* ---------------- shared widgets ---------------- */
function weekCalendar(crew, opts = {}) {
  const days = [...Array(7)].map((_, i) => addDays(state.week, i));
  const hzChips = ['all', ...HAZARDS.map((h) => h.key)].map((k) => `<button class="chip ${state.hazardFilter === k ? 'on' : ''}" data-hz="${k}">${k === 'all' ? 'All' : HAZARDS.find((h) => h.key === k).label}</button>`).join('');
  const cols = days.map((d) => {
    const evs = eventsFor(crew, d);
    const tst = crew === 'A' ? valueAt('Total Sleep Time', d) : null;
    const hasSleep = tst && tst.date === d;
    const max = opts.dense ? 4 : 3;
    const list = evs.slice(0, max).map((e) => {
      const dim = state.hazardFilter !== 'all' && !e.hazards.includes(state.hazardFilter);
      const hz = e.category === 'Spacewalk' ? 'hz-spacewalk' : e.hazards.includes('radiation') ? 'hz-radiation' : '';
      return `<div class="ev ${e.category} ${hz} ${dim ? 'dim' : ''}" title="${esc(`${e.start_time}–${e.end_time} ${e.title} · ${e.category} · ${e.hazards.join(', ')}`)}"><div class="t">${e.start_time}</div>${esc(e.title)}</div>`;
    }).join('');
    const sleep = crew === 'A'
      ? (hasSleep ? `<div class="ev sleep"><div class="t">07:00 · Sleep</div><b>${fmt(tst.v, 'Total Sleep Time')} h</b></div>` : `<div class="ev sleep"><div class="t">Sleep</div><b style="font-size:11px">No data yet</b></div>`)
      : '';
    const wd = toD(d).getUTCDay();
    return `<a class="dayc ${d === TODAY ? 'today' : ''} ${d === state.date && d !== TODAY ? 'sel' : ''}" href="${opts.dayHref(d)}">
      <div class="dn">${WD[wd]} ${String(toD(d).getUTCDate()).padStart(2, '0')}</div><div class="dd">${dayLabel(d)}</div>
      ${sleep}${list}${evs.length > max ? `<div class="ev-more">+${evs.length - max} more</div>` : ''}</a>`;
  }).join('');
  const end = days[6];
  return `<div class="cal-head">
      <button class="arrow" data-week="-7" aria-label="Previous week">‹</button>
      <span class="range">${MON[toD(state.week).getUTCMonth()]} ${String(toD(state.week).getUTCDate()).padStart(2, '0')}–${toD(state.week).getUTCMonth() === toD(end).getUTCMonth() ? '' : MON[toD(end).getUTCMonth()].slice(0, 3) + ' '}${String(toD(end).getUTCDate()).padStart(2, '0')}, ${toD(end).getUTCFullYear()}</span>
      <button class="arrow" data-week="7" aria-label="Next week">›</button>
      <div class="chips">${hzChips}</div>
    </div>
    <div class="week">${cols}</div>`;
}
function chatPanel(role, { mini = false } = {}) {
  const msgs = chat();
  const shown = mini ? msgs.slice(-2) : msgs;
  const crewSide = role === 'crew';
  let lastDate = '';
  const log = shown.map((m) => {
    const me = m.from === role;
    let sep = '';
    if (!mini && m.date !== lastDate) { sep = `<div class="daysep">${weekday(m.date)}, ${shortDate(m.date)} · ${dayLabel(m.date)}</div>`; lastDate = m.date; }
    const who = me ? (crewSide ? 'You' : 'You — Ground doctor') : (crewSide ? 'Ground doctor' : 'Crew A');
    const plain = !mini && !crewSide ? false : false;
    return `${sep}<div class="msg ${me ? 'me' : ''} ${plain ? 'plain' : ''}"><div class="who">${who}</div>${esc(m.text)}<div class="meta">${dayLabel(m.date)} ${m.time} · ${me ? 'Delivered' : 'Received'}</div></div>${m.attach ? `<div class="attach" style="align-self:${me ? 'flex-end' : 'flex-start'}">Attached: ${esc(m.attach)}</div>` : ''}`;
  }).join('');
  const head = crewSide
    ? `<img class="avatar md" src="${IMG.doctor}" alt="Ground doctor"><div><b>Ground doctor</b><small>Flight care team · 1:1 chat</small></div>`
    : `<img class="avatar md" src="${IMG.A}" alt="Crew A"><div><b>Crew A</b><small>Crew A · 1:1 conversation</small></div>`;
  return `<div class="card chat ${mini ? 'mini' : ''}">
    <div class="chat-head">${head}</div>
    <div class="log" id="chatlog">${!mini ? `<div class="note">Messages may take time to reach ${crewSide ? 'Earth' : 'the crew'}. We'll show you when they arrive.</div>` : ''}${log}</div>
    <form class="compose" data-chat="${role}"><span class="plus">+</span><input name="m" placeholder="Write a message to ${crewSide ? 'your doctor' : 'Crew A'}…" autocomplete="off"><button class="btn primary" type="submit">Send ➤</button></form>
  </div>`;
}
function statusRow(s, href) {
  const meta = s.r ? `${dayLabel(s.r.date)} ${s.r.time} · ${s.method || s.category}${s.period ? ' · ' + s.period : ''}` : 'No reading yet';
  return `<a class="row" href="${href}" title="${esc(s.info.summary || '')}"><div class="nm"><b>${esc(s.name)}</b><small>${esc(meta)}</small></div><span class="val">${s.v == null ? '—' : esc(fmt(s.v, s.b))}<small>${esc(unitOf(s.b))}</small></span><span class="badge ${s.status}">${SEV_LABEL[s.status]}</span></a>`;
}

/* ---------------- CREW PAGES ---------------- */
function crewHome() {
  const d = state.date;
  const states = allStates(d);
  const toCheck = states.filter((s) => s.status === 'urgent' || s.status === 'potential');
  return `${topbar('crew', 'home')}<main class="page">
    <section class="hero mars">
      <div class="hero-row">
        <img class="avatar xl" src="${IMG.A}" alt="Crew A profile photo">
        <div>
          <span class="chip-day"><i></i>${dayLabel(d)} · MARS</span>
          <h1>Welcome back, <b>Crew A</b></h1>
          <p>${weekday(d)}, ${shortDate(d)}<span class="sep">|</span>${toCheck.length ? `${toCheck.length} thing${toCheck.length > 1 ? 's' : ''} to check in your health today.` : 'Everything looks normal today.'}</p>
        </div>
      </div>
    </section>
    <section class="card" style="margin-bottom:16px">
      <div class="cal">
        <div class="today-card">
          <div class="lbl">${d === TODAY ? 'TODAY' : 'SELECTED'}</div>
          <div class="big">${dayLabel(d)}</div>
          <div style="color:var(--navy-300);font-size:13px">${weekday(d)}, ${shortDate(d)}</div>
          <a class="open" href="#/crew/day/${d}">Open my day →</a>
          ${d !== TODAY ? `<br><a class="open" style="color:var(--navy-300);margin-top:6px" href="#/crew/day/${TODAY}">↺ Back to today</a>` : ''}
          <div class="moon"></div>
        </div>
        <div>${weekCalendar('A', { dayHref: (x) => `#/crew/day/${x}` })}</div>
      </div>
    </section>
    <div class="grid g-2">
      ${crewInstructionCard(states, true)}
      <div class="grid" style="align-content:start">
        <section class="card">
          <div class="card-head"><h3>My hazard board</h3><div class="legend"><span><i class="dot urgent"></i>Urgent</span><span><i class="dot potential"></i>Potential</span><span><i class="dot" style="background:var(--sky)"></i>Normal</span></div></div>
          <div class="hazard-wrap">${hazardBoard(states)}</div>
        </section>
        ${chatPanel('crew', { mini: true })}
      </div>
    </div>
  </main>`;
}
function crewInstructionItems(states) {
  const d = state.date; const items = [];
  states.filter((s) => s.status === 'urgent' || s.status === 'potential').forEach((s) => {
    items.push({ kind: 'care', html: `<a class="item" href="#/crew/bio/${enc(s.b)}"><div class="k">Care guidance</div><div class="ttl ${s.status}">${esc(s.name)} · ${SEV_LABEL[s.status]}</div><div class="desc">${esc(instructionFor(s))}</div><div class="foot">${dayLabel(s.r.date)} ${s.r.time} · ${esc(fmtU(s.v, s.b))} · ${esc(s.category)} · Based on health_instruction.csv</div></a>`, text: s.name + s.category + instructionFor(s) });
  });
  const tst = valueAt('Total Sleep Time', d), se = valueAt('Sleep Efficiency', d);
  if (tst) items.push({ kind: 'health', html: `<a class="item" href="#/crew/day/${d}"><div class="k">My health</div><div class="ttl">Your sleep check on ${shortDate(tst.date)} ›</div><div class="desc">Time asleep: ${fmt(tst.v, 'Total Sleep Time')} hours · Sleep efficiency: ${se ? fmt(se.v, 'Sleep Efficiency') : '—'}%</div><div class="foot">${dayLabel(tst.date)} ${tst.time} · A_hotdata.csv</div></a>`, text: 'sleep check' });
  items.push({ kind: 'health', html: `<a class="item" href="#/crew/attention"><div class="k">My health</div><div class="ttl">All my biomarkers ›</div><div class="desc">${states.filter((s) => s.status !== 'nodata').length} tracked · ${states.filter((s) => s.status === 'urgent').length} urgent · ${states.filter((s) => s.status === 'potential').length} potential</div></a>`, text: 'biomarkers all' });
  const ns = notes();
  if (ns.length) ns.slice().reverse().forEach((n) => items.push({ kind: 'notes', html: `<div class="item"><div class="k">Doctor's notes</div><div class="ttl">${esc(n.title || 'Instruction from your ground doctor')}</div><div class="desc">${esc(n.text)}</div><div class="foot">${dayLabel(n.date)} ${n.time} · Ground doctor</div></div>`, text: (n.title || '') + n.text }));
  else items.push({ kind: 'notes', html: `<div class="item"><div class="k">Doctor's notes</div><div class="ttl">Your doctor's notes will appear here ›</div><div class="desc">Prior consultations and diagnoses are saved here when you add them.</div><div class="foot">No physician notes supplied</div></div>`, text: 'doctor notes' });
  return items;
}
function crewInstructionCard(states, home) {
  const items = crewInstructionItems(states);
  const f = state.instrFilter, q = state.query.toLowerCase();
  const kinds = { all: null, health: 'health', notes: 'notes', care: 'care' };
  const shown = items.filter((i) => (!kinds[f] || i.kind === kinds[f]) && (!q || i.text.toLowerCase().includes(q)));
  const chips = [['all', 'All'], ['health', 'My health'], ['notes', "Doctor's notes"], ['care', 'Care guidance']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-if="${k}">${l}</button>`).join('');
  return `<section class="card">
    <div class="card-head"><h3>${home ? 'Health Instruction' : 'Helpful for you right now'}</h3>${home ? '<a class="more" href="#/crew/instructions" aria-label="Open Health Instruction">›</a>' : ''}</div>
    ${home ? `<form class="search" data-search="query"><label class="field"><span>⌕</span><input name="q" value="${esc(state.query)}" placeholder="Search a symptom, a health check or a doctor's note…"></label></form><div class="chips" style="margin-bottom:12px">${chips}</div>` : ''}
    <div class="items">${shown.map((i) => i.html).join('') || '<div class="empty">Nothing matches your search.</div>'}</div>
  </section>`;
}
function crewInstructions() {
  const states = allStates(state.date);
  const f = state.instrFilter;
  const chips = [['all', 'All'], ['health', 'My health'], ['notes', "Doctor's notes"], ['care', 'Care guidance']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-if="${k}">${l}</button>`).join('');
  return `${topbar('crew', 'instr')}<main class="page dark">
    <h1 class="page-title">Health Instruction</h1>
    <form class="search" data-search="query"><label class="field"><span>⌕</span><input name="q" value="${esc(state.query)}" placeholder="Search a symptom, a health check or a doctor's note…"></label><button class="go" type="submit">⌕ Search</button></form>
    <div class="chips" style="margin-bottom:18px">${chips}<a class="chip" href="#/crew/attention" style="margin-left:auto">See all biomarkers ›</a></div>
    <div class="grid g-side-main">
      <section class="card" style="align-self:start">
        <h3>My health profile</h3><div class="hint" style="margin-bottom:14px">Crew A</div>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px"><img class="avatar lg" src="${IMG.A}" alt="Crew A"><div><b>Crew A</b><div class="hint">${dayLabel(state.date)} · Mars mission</div></div></div>
        <b style="font-size:13px">Your basic health details</b>
        <div class="hint" style="margin:6px 0 2px">Medical history: Not added</div><div class="hint">Allergies: Not added</div><div class="hint" style="margin-bottom:16px">Medication: Not added</div>
        <a class="btn primary block" href="#/crew/profile">Edit my information</a>
      </section>
      ${crewInstructionCard(states, false)}
    </div>
  </main>`;
}
function attentionPage(role) {
  const base = role === 'crew' ? '#/crew' : '#/doctor';
  const states = allStates(state.date);
  const q = state.query.toLowerCase(); const f = state.attFilter;
  const match = (s) => !q || (s.name + s.b + s.category + (s.info.summary || '')).toLowerCase().includes(q);
  const cnt = (k) => states.filter((s) => s.status === k).length;
  const groups = ['urgent', 'potential', 'normal'].filter((k) => f === 'all' || f === k);
  const list = groups.map((k) => {
    const ss = states.filter((s) => s.status === k && match(s));
    if (!ss.length) return '';
    if (k === 'normal') return `<div class="sev-h normal">NORMAL · ${ss.length}</div><div class="mini-grid">${ss.map((s) => statusRow(s, `${base}/bio/${enc(s.b)}`)).join('')}</div>`;
    return `<div class="sev-h ${k}">${k.toUpperCase()} · ${ss.length}</div>${ss.map((s) => `
      <a class="alert" href="${base}/bio/${enc(s.b)}" style="display:block">
        <div class="top"><div class="nm"><div class="lbl ${k}"><i class="dot ${k}"></i>${k.toUpperCase()}</div><h4>${esc(s.name)}</h4><small>${esc(s.category)} · ${esc(s.method)}</small></div>
          <div class="v">${esc(fmtU(s.v, s.b))}<small style="font-size:10.5px;color:var(--navy-400)">${dayLabel(s.r.date)} · ${s.r.time} UTC</small></div><span style="color:var(--navy-400)">›</span></div>
        <div class="body ${k}"><div class="k">${k === 'urgent' ? 'DO THIS NOW' : 'WHAT TO DO'}</div>${esc(instructionFor(s))}</div>
      </a>`).join('')}`;
  }).join('');
  const chip = (k, l) => `<button class="chip ${f === k ? 'on' : ''}" data-af="${k}">${k !== 'all' ? `<i class="dot ${k}"></i>` : ''}${l}<span class="n">${k === 'all' ? states.length : cnt(k)}</span></button>`;
  return `${topbar(role, 'instr')}<main class="page dark">
    ${role === 'doctor' ? `<a class="back" href="#/doctor/instructions">← Health Instruction Library</a>` : `<a class="back" href="#/crew/instructions">← Health Instruction</a>`}
    <h1 class="page-title">${role === 'crew' ? 'What needs your attention' : "Crew A · what needs attention"}</h1>
    <p class="page-sub">${role === 'crew' ? 'Your biomarkers, most urgent first. Tap one to see what it means and your past records.' : 'Crew A biomarkers on ' + longDate(state.date) + ', most urgent first.'}</p>
    <form class="search" data-search="query"><label class="field"><span>⌕</span><input name="q" value="${esc(state.query)}" placeholder="Search a biomarker, a category or a symptom…"></label><button class="go" type="submit">⌕ Search</button></form>
    <div class="chips">${chip('urgent', 'Urgent')}${chip('potential', 'Potential')}${chip('normal', 'Normal')}<span style="flex:1"></span>${chip('all', 'All')}</div>
    ${list || '<div class="empty">Nothing matches your search.</div>'}
  </main>`;
}
function dayPage(role, date, crew = 'A') {
  date = clampData(date);
  const states = allStates(date);
  const base = role === 'crew' ? '#/crew' : `#/doctor/crew/${crew}`;
  const dayBase = role === 'crew' ? '#/crew/day' : `#/doctor/day/${crew}`;
  const bioBase = role === 'crew' ? '#/crew/bio' : '#/doctor/bio';
  const tst = valueAt('Total Sleep Time', date);
  const tstOk = tst && tst.date === date;
  const tstSt = tstOk ? statusOf('Total Sleep Time', tst.v) : 'nodata';
  const sleepRows = SLEEP_CORE.map((b) => states.find((s) => s.b === b)).filter(Boolean);
  const coreStatus = sleepRows.reduce((m, s) => (SEV[s.status] > SEV[m] ? s.status : m), 'normal');
  const evs = eventsFor(crew, date);
  const others = states.filter((s) => !SLEEP_CORE.includes(s.b));
  const cats = {};
  others.forEach((s) => { (cats[s.category] = cats[s.category] || []).push(s); });
  const catOrder = Object.keys(cats).sort((a, z) => Math.max(...cats[z].map((s) => SEV[s.status])) - Math.max(...cats[a].map((s) => SEV[s.status])) || a.localeCompare(z));
  const sleepMsg = { normal: ['Your sleep looks normal', 'Sleep time is within the normal range.'], potential: ['Your sleep needs attention', 'Sleep time is below the recommended range.'], urgent: ['Your sleep is severely short', 'Hold safety-critical work and tell your ground doctor.'], nodata: ['No sleep data yet', 'Sleep is recorded each morning at 07:00.'] }[tstSt];
  const nextAction = coreStatus === 'normal' ? 'No action is needed for sleep today.' : instructionFor(sleepRows.find((s) => s.status === coreStatus));
  return `${topbar(role, role === 'crew' ? 'home' : 'home')}<main class="page">
    <a class="back" href="${base}">← ${role === 'crew' ? 'My Calendar' : 'Crew ' + crew}</a>
    <div class="dayhead">
      <div class="big">${dayLabel(date)}</div>
      <div><div class="dw">${weekday(date).toUpperCase()}</div><div class="dt">${longDate(date)}</div></div>
      <div class="nav"><a class="arrow" href="${dayBase}/${addDays(date, -1)}" aria-label="Previous day" ${date <= DATA_FIRST ? 'style="visibility:hidden"' : ''}>‹</a><a class="arrow" href="${dayBase}/${addDays(date, 1)}" aria-label="Next day" ${date >= DATA_LAST ? 'style="visibility:hidden"' : ''}>›</a></div>
    </div>
    <section class="sleep-sum"><span class="badge ${tstSt === 'nodata' ? 'nodata' : tstSt}">${sleepMsg[0]}</span><h3>${tstOk ? `${role === 'crew' ? 'You' : 'Crew ' + crew} slept ${fmt(tst.v, 'Total Sleep Time')} hours last night.` : 'Sleep not recorded yet.'}</h3><p class="hint">${sleepMsg[1]}</p></section>
    <div class="grid g-main-side">
      <div class="grid" style="align-content:start">
        <section class="card"><h3>${role === 'crew' ? 'Your health checks' : 'Sleep checks'}</h3><p class="hint" style="margin-bottom:12px">Every record includes its measurement time.</p>
          <div class="items">${sleepRows.map((s) => statusRow(s, `${bioBase}/${enc(s.b)}`)).join('')}</div></section>
        <section class="card"><h3>${role === 'crew' ? 'Your activities' : 'Activities'}</h3><p class="hint" style="margin-bottom:10px">From the crew calendar · ${evs.length} item${evs.length === 1 ? '' : 's'}</p>
          <div class="acts">${evs.map((e) => `<span title="${esc(e.category + ' · ' + e.hazards.join(', '))}"><b>${e.start_time}</b>${esc(e.title)}</span>`).join('') || '<span class="hint">No scheduled activities.</span>'}</div></section>
        <section class="card"><h3>Other health checks</h3><p class="hint">Grouped by category from health_instruction.csv. Hover a name to see what it measures.</p>
          ${catOrder.map((c) => `<div class="grp">${esc(c)}</div><div class="items">${cats[c].map((s) => statusRow(s, `${bioBase}/${enc(s.b)}`)).join('')}</div>`).join('')}
        </section>
      </div>
      <section class="card" style="align-self:start"><h3>What to do next</h3><p style="margin:8px 0 14px;font-size:13px">${esc(nextAction)}</p>
        ${role === 'crew' ? `<a class="btn primary" href="#/crew/chat?attach=${enc('Sleep check · ' + dayLabel(date))}">💬 Message my doctor</a>` : `<button class="btn primary" data-modal="instruction">Send instruction</button>`}
      </section>
    </div>
  </main>`;
}
function bioPage(role, b) {
  const s = bioState(b, state.date);
  const base = role === 'crew' ? '#/crew' : '#/doctor';
  const rule = DB.rules[b] || {};
  const cont = DB.continuous.has(b);
  // chart points: continuous → hourly means up to selected date; others → each reading
  let pts;
  if (cont) {
    const by = {};
    DB.series[b].forEach((p) => { if (p.date <= state.date) { const k = p.date + ' ' + p.time.slice(0, 2); (by[k] = by[k] || []).push(p.v); } });
    const keys = Object.keys(by).sort().slice(-24 * 7);
    pts = keys.map((k) => ({ date: k.slice(0, 10), v: by[k].reduce((a, z) => a + z, 0) / by[k].length, label: `${dayLabel(k.slice(0, 10))} ${k.slice(11)}h` }));
  } else pts = DB.series[b] ? DB.series[b].filter((p) => p.date <= state.date).map((p) => ({ date: p.date, v: p.v, label: dayLabel(p.date) })) : [];
  const base3 = DB.series[b] ? dailyPoints(b, '2026-11-03') : [];
  const baseline = base3.length ? base3.reduce((a, p) => a + p.v, 0) / base3.length : null;
  const diff = baseline != null && s.v != null ? s.v - baseline : null;
  const crewSide = role === 'crew';
  return `${topbar(role, 'instr')}<main class="page">
    <a class="back" href="${base}/${crewSide ? 'attention' : 'instructions'}">← ${crewSide ? 'Health Instruction' : 'Crew health instructions'}</a>
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><h1 class="page-title">${esc(s.name)}</h1><span class="badge ${s.status === 'urgent' ? 'solid-urgent' : s.status}">${SEV_LABEL[s.status]}</span>${!crewSide ? '<span class="badge dark">Crew A</span>' : ''}</div>
    ${s.name !== b ? `<div class="hint" style="color:var(--navy-400);margin-top:-2px">${esc(b)}</div>` : ''}
    <p class="page-sub" style="max-width:640px;margin-top:6px">${esc(s.info.summary || '')}</p>
    <section class="do-now ${s.status}">
      <div class="k">${s.status === 'urgent' ? 'DO THIS NOW' : s.status === 'potential' ? 'WHAT TO DO' : s.status === 'normal' ? 'STATUS' : 'NO DATA'}</div>
      <p>${esc(instructionFor(s))}</p>
      <div class="sub"><b>Latest reading: ${esc(fmtU(s.v, b))}</b><span class="hint">${s.r ? `${dayLabel(s.r.date)} ${s.r.time} UTC${cont ? ` · daily mean of ${s.r.n} readings, ${s.r.flag} flagged (range ${fmt(s.r.min, b)}–${fmt(s.r.max, b)})` : ''}` : 'Not measured yet'}</span></div>
    </section>
    <div class="grid g-main-side">
      <div class="grid" style="align-content:start">
        <section class="card"><div class="card-head"><h3>${crewSide ? 'My past record' : 'Past record'}</h3><span class="hint">${cont ? 'Hourly average · last 7 days' : `${pts.length} readings in November`}</span></div>${lineChart(b, pts, { w: 640, h: 260 })}</section>
        <section class="card"><h3>Measure period</h3>
          <dl class="kv" style="margin-top:12px">
            <dt>Criteria</dt><dd>${rule.yellowRaw ? `Normal: ${esc(rule.yellowRaw)} · Urgent: ${esc(rule.redRaw)}` : 'Interpreted against the astronaut’s own baseline.'}</dd>
            <dt>Method</dt><dd>${esc(s.method || '—')}</dd>
            <dt>Recommended timing</dt><dd>${esc(s.period || '—')}</dd>
            <dt>Hazards</dt><dd>${s.hazards.map((h) => `<span class="chip" style="margin-right:4px">${esc(h)}</span>`).join('') || '—'}</dd>
            <dt>Flagged days</dt><dd>${s.flagged} of ${s.pts.length} days</dd>
          </dl>
        </section>
      </div>
      <div class="grid" style="align-content:start">
        <section class="earth-space">
          <div class="track"><img src="${IMG.earth}" alt=""><i></i><img src="${IMG.mars}" alt=""></div>
          <h4>Earth vs space</h4>
          <p style="font-size:13px;color:var(--navy-200)">Compare the current value with the start of this data window (Nov 1–3 average) to see how the mission is changing ${crewSide ? 'you' : 'Crew A'}.</p>
          <div class="cmp"><div><small>Nov 1–3 baseline</small><b>${baseline != null ? esc(fmt(baseline, b)) : '—'}</b></div><div><small>${dayLabel(state.date)}</small><b>${esc(fmt(s.v, b))}</b></div></div>
          ${diff != null ? `<p style="margin-top:10px;font-size:12px;color:var(--yellow)">${diff >= 0 ? '▲' : '▼'} ${esc(fmt(Math.abs(diff), b))} ${esc(unitOf(b))} vs baseline</p>` : ''}
        </section>
        ${crewSide
          ? `<section class="card"><h3>Questions about this?</h3><p class="hint" style="margin:6px 0 12px">Share this record with your ground doctor.</p><a class="btn primary" href="#/crew/chat?attach=${enc(s.name + ' · ' + dayLabel(state.date))}">Share with Ground Doctor</a></section>`
          : `<section class="card"><h3>Update the crew</h3><p class="hint" style="margin:6px 0 12px">Send a personalised instruction. It appears in Crew A’s Health Instruction.</p><button class="btn primary" data-modal="instruction" data-bio="${esc(b)}">Send instruction</button></section>`}
      </div>
    </div>
  </main>`;
}
function chatPage(role) {
  const crewSide = role === 'crew';
  const left = crewSide
    ? `<section class="card" style="align-self:start"><div class="chip" style="display:inline-block;margin-bottom:12px">1:1 conversation</div>
        <div class="item"><div style="display:flex;gap:10px;align-items:center"><img class="avatar sm" src="${IMG.doctor}" alt=""><b>Ground doctor</b></div><div class="hint" style="margin-top:6px">Your flight care team</div></div>
        <div style="font-weight:600;margin:16px 0 8px">Shared in this chat</div>
        ${chat().filter((m) => m.attach).map((m) => `<div class="item" style="margin-bottom:8px"><b>${esc(m.attach)}</b><div class="hint">${m.time} UTC</div></div>`).join('') || '<div class="hint">Nothing shared yet.</div>'}
        <a class="btn primary block" style="margin-top:10px" href="#/crew/day/${state.date}">↗ View shared record</a>
        <p class="hint" style="margin-top:10px">Your messages stay saved here while the connection is delayed.</p></section>`
    : `<section class="card convo-list" style="align-self:start"><h3>💬 Conversations</h3><p class="hint" style="margin-bottom:12px">4 assigned astronauts</p>
        <div class="items">${CREWS.map((c) => {
          const last = c === 'A' ? chat()[chat().length - 1] : null;
          return `<div class="item ${c === 'A' ? 'on' : ''}" style="display:flex;gap:10px;align-items:center"><img class="avatar sm" src="${IMG[c]}" alt=""><div style="min-width:0"><b>Crew ${c}</b><div class="hint" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last ? esc(last.text) : 'No messages yet'}</div><div class="hint">${last ? last.time + ' UTC · Latest message' : 'Open 1:1 conversation'}</div></div></div>`;
        }).join('')}</div></section>`;
  return `${topbar(role, '')}<main class="page">
    <a class="back" href="${crewSide ? '#/crew' : '#/doctor'}">← ${crewSide ? 'Calendar' : 'Home'}</a>
    <h1 class="page-title" style="margin-bottom:20px">${crewSide ? 'A conversation with your doctor.' : 'A conversation with Crew A.'}</h1>
    <div class="grid g-side-main">${left}${chatPanel(role)}</div>
  </main>`;
}
function profilePage(role) {
  const crewSide = role === 'crew';
  const ns = notes();
  return `${topbar(role, 'profile')}<main class="page">
    <h1 class="page-title">My profile</h1><p class="page-sub">${crewSide ? 'Your profile details for this mission.' : 'Manage your personal information and care-team records.'}</p>
    <div class="grid g-side-main">
      <section class="card" style="align-self:start;text-align:left">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:16px"><img class="avatar lg" src="${crewSide ? IMG.A : IMG.doctor}" alt="${crewSide ? 'Crew A' : 'Ground doctor'} profile photo"><div><h3>${crewSide ? 'Crew A' : 'Ground doctor'}</h3><div class="hint">${crewSide ? 'Astronaut · Mars mission' : 'Flight surgeon · Earth'}</div></div></div>
        <b style="font-size:13px">${crewSide ? 'My health information' : 'Professional information'}</b>
        ${crewSide ? '<div class="hint" style="margin-top:6px">Medical history: Not added</div><div class="hint">Allergies: Not added</div><div class="hint">Medication: Not added</div>' : '<div class="hint" style="margin-top:6px">Specialty: Not added</div><div class="hint">Organization: Not added</div><div class="hint">Assigned crew: A, B, C, D</div>'}
        <button class="btn primary block" style="margin:16px 0">Update my details</button>
        <b style="font-size:13px">Doctor's notes</b>
        <p class="hint" style="margin:6px 0 12px">${ns.length ? `${ns.length} note${ns.length > 1 ? 's' : ''} saved.` : "Your doctor's assessments will appear here when a record is added."}</p>
        <a class="btn primary block" href="${crewSide ? '#/crew' : '#/doctor'}/instructions">Open Health Instruction</a>
      </section>
      <div class="grid" style="align-content:start">
        <section class="card"><h3>👤 Personal information</h3><p class="hint" style="margin-bottom:14px">${crewSide ? 'Your profile details for this mission.' : 'Your care-team profile for this mission.'}</p>
          <dl class="kv"><dt>Name</dt><dd>${crewSide ? 'Crew A' : 'Not added'}</dd><dt>Email</dt><dd>Not added</dd><dt>Mission start date</dt><dd>October 1, 2026</dd><dt>${crewSide ? 'Mission time' : 'Mission reference'}</dt><dd>${crewSide ? dayLabel(state.date) : 'SOL ' + String(missionDay(state.date)).padStart(3, '0')}</dd></dl></section>
        <section class="card"><h3>📋 ${crewSide ? 'My records' : 'Care records'}</h3>
          <div class="items" style="margin-top:12px">
            <a class="item" href="${crewSide ? '#/crew/attention' : '#/doctor/crew/A'}"><div class="ttl" style="font-size:14px">${crewSide ? 'Health history' : 'Crew health history'} ›</div><div class="hint">Medical history, allergies and medication</div></a>
            <div class="item"><div class="ttl" style="font-size:14px">${crewSide ? "Doctor's notes" : 'My consultation notes'} ›</div><div class="hint">${ns.length ? ns.map((n) => esc(n.title || n.text.slice(0, 40))).join(' · ') : 'Your saved assessments and consultations'}</div></div>
            <a class="item" href="${crewSide ? '#/crew' : '#/doctor'}/instructions"><div class="ttl" style="font-size:14px">Saved instructions ›</div><div class="hint">Care guidance you can return to</div></a>
          </div></section>
      </div>
    </div>
  </main>`;
}

/* ---------------- DOCTOR PAGES ---------------- */
function libraryItems(states) {
  const extra = libExtra().map((x) => ({ ...x, mine: true }));
  const sA = Object.fromEntries(states.map((s) => [s.b, s]));
  const base = Object.values(DB.info).map((i) => {
    const s = sA[i.biomarker];
    return { b: i.biomarker, category: i.category, status: s ? s.status : 'nodata', forCrew: !!s, text: s && s.status !== 'normal' && s.status !== 'nodata' ? instructionFor(s) : i.summary, yi: i.yellow_instruction, ri: i.red_instruction };
  });
  const all = [...extra.map((x) => ({ b: x.biomarker || x.title, category: 'Added by me', status: 'mine', forCrew: false, text: x.text, mine: true })), ...base];
  return all.sort((a, z) => (SEV[z.status] || 0) - (SEV[a.status] || 0) || (z.forCrew - a.forCrew) || a.b.localeCompare(z.b));
}
function libraryList(states, limit) {
  const f = state.libFilter, q = state.libQuery.toLowerCase();
  let items = libraryItems(states).filter((i) => (f === 'all' || (f === 'crew' && i.forCrew) || (f === 'potential' && i.status === 'potential') || (f === 'urgent' && i.status === 'urgent') || (f === 'mine' && i.mine)) && (!q || (i.b + i.category + i.text).toLowerCase().includes(q)));
  const total = items.length;
  if (limit) items = items.slice(0, limit);
  const chips = [['all', 'All'], ['crew', 'For this crew'], ['potential', 'Potential'], ['urgent', 'Urgent'], ['mine', 'Added by me']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-lf="${k}">${l}</button>`).join('');
  return `<form class="search" data-search="libQuery"><label class="field"><span>⌕</span><input name="q" value="${esc(state.libQuery)}" placeholder="Search a biomarker, category or protocol…"></label></form>
    <div class="chips" style="margin-bottom:12px">${chips}</div>
    <div class="items">${items.map((i) => `<a class="item lib-item" href="${i.mine ? '#/doctor/instructions' : '#/doctor/bio/' + enc(i.b)}">
      <div class="tags">${i.status === 'urgent' || i.status === 'potential' ? `<span class="badge ${i.status}">${SEV_LABEL[i.status]}</span>` : ''}${i.forCrew && (i.status === 'urgent' || i.status === 'potential') ? '<span class="badge dark">Matches Crew A</span>' : ''}${i.mine ? '<span class="badge dark">Added by me</span>' : ''}${!i.forCrew && !i.mine ? '<span class="badge nodata">Not measured</span>' : ''}</div>
      <div class="ttl" style="font-size:14px">${esc(nice(i.b))} <span class="hint" style="font-weight:400">${esc(i.category)}</span></div><div class="desc">${esc(i.text)}</div></a>`).join('') || '<div class="empty">Nothing matches.</div>'}</div>
    ${limit && total > limit ? `<a class="hint" style="display:block;text-align:center;margin-top:10px" href="#/doctor/instructions">See all ${total} →</a>` : ''}`;
}
function doctorHome() {
  const states = allStates(state.date);
  const flagged = states.filter((s) => s.status === 'urgent' || s.status === 'potential');
  const ranked = states.filter((s) => s.status !== 'nodata');
  const per = 3; const pages = Math.ceil(ranked.length / per);
  state.carousel = Math.min(state.carousel, pages - 1);
  const slice = ranked.slice(state.carousel * per, state.carousel * per + per);
  const crewTile = (c) => {
    const st = c === 'A' ? states : null;
    const sub = c === 'A' ? (flagged.length ? flagged.slice(0, 2).map((s) => s.name).join(' · ') : 'All clear') : 'No data yet';
    const worst = c === 'A' && flagged.length ? flagged[0].status : '';
    return `<a class="crew-tile ${c === state.docCrew ? 'on' : ''}" href="#/doctor/crew/${c}">${miniDonut(st, c, IMG[c])}<b>Crew ${c}</b><small class="${worst}">${esc(sub)}</small></a>`;
  };
  const big = slice[0], small = slice.slice(1);
  const bigCard = big ? `<a class="bio-big" href="#/doctor/bio/${enc(big.b)}">
      <div style="display:flex;justify-content:space-between;gap:10px"><div><h4><span class="rk">#${state.carousel * per + 1}</span>${esc(big.name)}</h4><small class="hint">${esc(big.category)}</small></div><div><div class="num ${big.status}">${esc(fmt(big.v, big.b))}</div><div style="text-align:right;margin-top:6px"><span class="badge ${big.status}">${SEV_LABEL[big.status]}</span></div></div></div>
      <div style="margin-top:10px">${lineChart(big.b, big.pts.slice(-14), { w: 420, h: 220, labels: false })}</div>
      <div class="hint" style="display:flex;justify-content:space-between;margin-top:6px"><span>${esc(DB.rules[big.b] && DB.rules[big.b].yellowRaw ? 'Normal: ' + DB.rules[big.b].yellowRaw : '')} · ${big.pts.slice(-14).filter((p) => statusOf(big.b, p.v) !== 'normal').length} of ${big.pts.slice(-14).length} readings flagged in 14 days</span><span style="color:var(--electric)">Open records ›</span></div></a>` : '';
  const smallCards = small.map((s, i) => `<a class="bio-small" href="#/doctor/bio/${enc(s.b)}"><div style="display:flex;justify-content:space-between;gap:6px"><h4><span class="rk">#${state.carousel * per + 2 + i}</span>${esc(s.name)}</h4><span class="num">${esc(fmt(s.v, s.b))}</span></div><div style="display:flex;justify-content:space-between;align-items:center"><small class="hint">${esc(s.category)}</small><span class="badge ${s.status}">${SEV_LABEL[s.status]}</span></div>${lineChart(s.b, s.pts.slice(-14), { w: 220, h: 90, compact: true, zones: false })}</a>`).join('');
  return `${topbar('doctor', 'home')}<main class="page">
    <section class="hero earth">
      <div class="hero-row"><img class="avatar xl" src="${IMG.doctor}" alt="Ground doctor profile photo"><div>
        <span class="chip-day"><i></i>${dayLabel(state.date)} · EARTH</span>
        <h1>Welcome back, <b>Doctor</b></h1>
        <p>4 astronauts in your care<span class="sep">|</span>${flagged.length} reading${flagged.length === 1 ? '' : 's'} to review today</p>
      </div></div>
    </section>
    <div class="grid g-instr">
      <section class="card"><div class="card-head"><h3>Health Instruction Library</h3><a class="more" href="#/doctor/instructions" aria-label="Open library">›</a></div>
        ${libraryList(states, 6)}
        <button class="btn navy block" style="margin-top:14px" data-modal="library">+ Add to library</button>
      </section>
      <section class="card">
        <div class="card-head"><h3>Crew hazard board</h3><div class="legend"><span><i class="dot urgent"></i>Urgent</span><span><i class="dot potential"></i>Potential</span><span><i class="dot" style="background:var(--sky)"></i>Normal</span></div></div>
        <div class="crew-tiles">${CREWS.map(crewTile).join('')}</div>
        <div class="card-head"><h3>Biomarkers · Crew A</h3><div style="display:flex;gap:6px;align-items:center"><span class="hint">${state.carousel + 1} / ${pages}</span><button class="arrow" data-car="-1" ${state.carousel === 0 ? 'disabled' : ''}>‹</button><button class="arrow" data-car="1" ${state.carousel >= pages - 1 ? 'disabled' : ''}>›</button></div></div>
        <div class="bio-car">${bigCard}<div class="grid" style="gap:10px">${smallCards}</div></div>
        <div class="pager-dots">${[...Array(Math.min(pages, 8))].map((_, i) => `<i class="${i === Math.min(state.carousel, 7) ? 'on' : ''}"></i>`).join('')}</div>
        <form class="compose" data-chat="doctor" style="padding:16px 0 0"><input name="m" placeholder="Write a message to Crew A…" autocomplete="off"><button class="btn primary" type="submit">Send ➤</button></form>
      </section>
    </div>
  </main>`;
}
function doctorCrew(c) {
  state.docCrew = c;
  const hasData = c === 'A';
  const states = hasData ? allStates(state.date) : [];
  const tileB = ['Total Sleep Time', 'Sleep Efficiency', 'Self-reported sleep quality', 'Mood', 'HbA1c', 'LDL-cholesterol'];
  const tiles = hasData ? tileB.map((b) => states.find((s) => s.b === b)).filter(Boolean).map((s) => `<a class="tile" href="#/doctor/bio/${enc(s.b)}"><small>${esc(s.name)}</small><div class="num ${s.status}">${esc(fmt(s.v, s.b))} <small style="font-size:12px">${esc(unitOf(s.b))}</small></div><div class="st ${s.status}">${SEV_LABEL[s.status]}</div>${spark(s.b, s.pts.slice(-10), 34)}</a>`).join('') : '';
  const cats = ['All', ...new Set(states.map((s) => s.category))];
  const shown = states.filter((s) => s.status !== 'nodata' && (state.bioCat === 'All' || s.category === state.bioCat));
  return `${topbar('doctor', 'home')}<main class="page">
    <a class="back" href="#/doctor">← Home</a>
    <div class="crew-head">
      <img class="avatar xl" src="${IMG[c]}" alt="Crew ${c} profile photo">
      <div><div class="lbl">ASTRONAUT · MARS MISSION</div><h1>Crew ${c}</h1><small>${dayLabel(state.date)} · Mission start Oct 1</small></div>
      <div class="right">
        <div class="crew-switch">${CREWS.map((x) => `<a class="${x === c ? 'on' : ''}" href="#/doctor/crew/${x}">${x}</a>`).join('')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${hasData ? `<a class="btn ghost" href="#/doctor/day/${c}/${state.date}">Daily records</a><button class="btn ghost" data-modal="instruction">Send instruction</button><a class="btn primary" href="#/doctor/chat">💬 Message</a>` : '<span class="hint" style="color:var(--navy-400)">Biomarker data for this crew is not loaded yet.</span>'}
        </div>
      </div>
    </div>
    <section class="card">${weekCalendar(c, { dense: true, dayHref: (x) => (hasData ? `#/doctor/day/${c}/${x}` : `#/doctor/crew/${c}`) })}</section>
    ${hasData ? `<div class="tiles">${tiles}</div>
    <section class="card">
      <div class="card-head"><h3>Biomarkers</h3><a class="hint" href="#/doctor/attention">Ranked list ›</a></div>
      <div class="chips" style="margin-bottom:14px">${cats.map((k) => `<button class="chip ${state.bioCat === k ? 'on' : ''}" data-cat="${esc(k)}">${esc(k)}</button>`).join('')}</div>
      <div class="bio-grid">${shown.map((s, i) => `<a class="bio-card ${s.status}" href="#/doctor/bio/${enc(s.b)}"><div class="h"><div><small>#${i + 1}</small> <b>${esc(s.name)}</b></div><span class="num ${s.status}">${esc(fmt(s.v, s.b))}</span></div><div class="h"><small>${esc(s.category)}</small><span class="badge ${s.status}">${SEV_LABEL[s.status]}</span></div>${spark(s.b, s.pts.slice(-14))}<div class="f">${s.flagged} of ${s.pts.length} readings flagged</div></a>`).join('')}</div>
    </section>` : `<section class="card" style="margin-top:16px"><div class="empty">Crew ${c} biomarker data will appear here once ${c}_hotdata.csv is added. The calendar above is live from events.csv.</div></section>`}
  </main>`;
}
function doctorInstructions() {
  const states = allStates(state.date);
  return `${topbar('doctor', 'instr')}<main class="page">
    <h1 class="page-title">Crew health instructions</h1>
    <p class="page-sub">Your instruction library from health_instruction.csv, matched to Crew A’s readings on ${longDate(state.date)}.</p>
    <div class="grid g-main-side">
      <section class="card">${libraryList(states)}</section>
      <div class="grid" style="align-content:start">
        <section class="card"><h3>Crew A today</h3><p class="hint" style="margin-bottom:12px">Biomarkers outside the normal range</p>
          <div class="items">${states.filter((s) => s.status === 'urgent' || s.status === 'potential').map((s) => statusRow(s, `#/doctor/bio/${enc(s.b)}`)).join('') || '<div class="empty">All clear.</div>'}</div>
          <a class="btn primary block" style="margin-top:12px" href="#/doctor/attention">Open ranked list</a></section>
        <section class="card"><h3>Sent to Crew A</h3>
          <div class="items" style="margin-top:10px">${notes().slice().reverse().map((n) => `<div class="item"><div class="ttl" style="font-size:14px">${esc(n.title || 'Instruction')}</div><div class="desc">${esc(n.text)}</div><div class="foot">${dayLabel(n.date)} ${n.time}</div></div>`).join('') || '<div class="hint">No instructions sent yet.</div>'}</div>
          <button class="btn navy block" style="margin-top:12px" data-modal="instruction">Send instruction</button></section>
        <section class="card"><h3>My library additions</h3>
          <div class="items" style="margin-top:10px">${libExtra().map((x) => `<div class="item"><div class="ttl" style="font-size:14px">${esc(x.title)}</div><div class="desc">${esc(x.text)}</div></div>`).join('') || '<div class="hint">Nothing added yet.</div>'}</div>
          <button class="btn navy block" style="margin-top:12px" data-modal="library">+ Add to library</button></section>
      </div>
    </div>
  </main>`;
}

/* ---------------- landing ---------------- */
function landing() {
  return `<main class="landing"><div class="inner">
    <img src="${IMG.logoYellow}" alt="KOOK — Kinetic Observation &amp; Optimal Keel">
    <h1>One mission. <span>Connected care.</span></h1>
    <p class="lead">Choose your side of the link. Data shown: Crew A, November 2026 (${dayLabel(DATA_FIRST)}–${dayLabel(DATA_LAST)}).</p>
    <div class="roles">
      <a class="role-card space" href="#/crew"><div class="who"><img class="avatar lg" src="${IMG.A}" alt=""><span class="badge dark">SPACE</span></div><h2>Astronaut · Crew A</h2><p>Your calendar, health checks and instructions from the ground.</p><span class="go">Enter as astronaut →</span></a>
      <a class="role-card earth" href="#/doctor"><div class="who"><img class="avatar lg" src="${IMG.doctor}" alt=""><span class="badge dark">EARTH</span></div><h2>Ground doctor</h2><p>Crew biodata, hazard board and the instruction library.</p><span class="go">Enter as doctor →</span></a>
    </div>
    <p class="credit">NASA Space Apps Challenge 2026 · KOOK</p>
  </div></main>`;
}

/* ---------------- modals ---------------- */
function openModal(kind, bio) {
  const root = $('#modal-root');
  const opts = DB.bios.map((b) => `<option value="${esc(b)}" ${b === bio ? 'selected' : ''}>${esc(nice(b))}</option>`).join('');
  root.innerHTML = kind === 'instruction'
    ? `<div class="modal-bg"><form class="modal" data-form="instruction"><h3>Send instruction to Crew A</h3>
        <label>Related biomarker</label><select name="bio"><option value="">General</option>${opts}</select>
        <label>Title</label><input name="title" required placeholder="e.g. Reduce sugar intake today" value="${bio ? esc(nice(bio) + ' follow-up') : ''}">
        <label>Instruction</label><textarea name="text" required placeholder="What should Crew A do?">${bio ? esc(instructionFor(bioState(bio, state.date))) : ''}</textarea>
        <div class="actions"><button type="button" class="btn cancel" data-close>Cancel</button><button class="btn primary">Send to crew</button></div></form></div>`
    : `<div class="modal-bg"><form class="modal" data-form="library"><h3>Add to library</h3>
        <label>Biomarker or protocol</label><input name="title" required placeholder="e.g. Post-EVA hydration protocol">
        <label>Instruction text</label><textarea name="text" required></textarea>
        <div class="actions"><button type="button" class="btn cancel" data-close>Cancel</button><button class="btn primary">Add</button></div></form></div>`;
  $('input, textarea', root)?.focus();
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };

/* ---------------- render + events ---------------- */
function render() {
  const { parts, qs } = route();
  const [role, sub, a1, a2] = parts;
  let html; let r = null;
  document.body.classList.toggle('space', role === 'crew' || role === 'doctor');
  if (role === 'crew') {
    r = 'crew';
    if (sub === 'day') { if (a1) setDate(a1); html = dayPage('crew', state.date); }
    else if (sub === 'instructions') html = crewInstructions();
    else if (sub === 'attention') html = attentionPage('crew');
    else if (sub === 'bio') html = bioPage('crew', a1);
    else if (sub === 'chat') html = chatPage('crew');
    else if (sub === 'profile') html = profilePage('crew');
    else html = crewHome();
  } else if (role === 'doctor') {
    r = 'doctor';
    if (sub === 'crew') html = doctorCrew(CREWS.includes(a1) ? a1 : 'A');
    else if (sub === 'day') { if (a2) setDate(a2); html = dayPage('doctor', state.date, 'A'); }
    else if (sub === 'instructions') html = doctorInstructions();
    else if (sub === 'attention') html = attentionPage('doctor');
    else if (sub === 'bio') html = bioPage('doctor', a1);
    else if (sub === 'chat') html = chatPage('doctor');
    else if (sub === 'profile') html = profilePage('doctor');
    else html = doctorHome();
  } else html = landing();
  $('#app').innerHTML = html;
  if (r) fab(r); else $('#fab-root').innerHTML = '';
  const log = $('#chatlog'); if (log) log.scrollTop = log.scrollHeight;
  const att = qs.get('attach');
  if (att && sub === 'chat') { const inp = $('.compose input'); if (inp) { inp.value = `Could you check my record? (${att})`; inp.dataset.attach = att; inp.focus(); } }
  document.title = r === 'crew' ? 'KOOK · Crew A' : r === 'doctor' ? 'KOOK · Ground Doctor' : 'KOOK Dashboard';
}
const rerender = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };

document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-close]'); if (!t) return;
  const d = t.dataset;
  if (d.week) { state.week = addDays(state.week, +d.week); rerender(); }
  else if (d.hz) { state.hazardFilter = d.hz; rerender(); }
  else if (d.if) { state.instrFilter = d.if; rerender(); }
  else if (d.af) { state.attFilter = d.af; rerender(); }
  else if (d.lf) { state.libFilter = d.lf; rerender(); }
  else if (d.cat) { state.bioCat = d.cat; rerender(); }
  else if (d.car) { state.carousel = Math.max(0, state.carousel + +d.car); rerender(); }
  else if (d.modal) openModal(d.modal, d.bio);
  else if (d.close !== undefined) closeModal();
});
$('#modal-root').addEventListener('click', (e) => { if (e.target.classList.contains('modal-bg')) closeModal(); });
document.addEventListener('submit', (e) => {
  const f = e.target; e.preventDefault();
  if (f.dataset.chat) {
    const inp = f.querySelector('input'); sendChat(f.dataset.chat, inp.value, inp.dataset.attach);
    if (location.hash.includes('?')) location.hash = location.hash.split('?')[0]; else rerender();
  } else if (f.dataset.search) {
    state[f.dataset.search] = f.q.value; rerender();
    const inp = document.querySelector(`form[data-search="${f.dataset.search}"] input`); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  } else if (f.dataset.form === 'instruction') {
    const n = notes(); const now = new Date().toISOString().slice(11, 16);
    n.push({ bio: f.bio.value, title: f.title.value.trim(), text: f.text.value.trim(), date: state.date, time: now }); store.set('notesA', n);
    sendChat('doctor', `New instruction: ${f.title.value.trim()} — open Health Instruction › Doctor's notes.`);
    closeModal(); rerender();
  } else if (f.dataset.form === 'library') {
    const l = libExtra(); l.push({ title: f.title.value.trim(), text: f.text.value.trim() }); store.set('library', l); closeModal(); rerender();
  }
});
// live search (debounced) for search fields
let st; document.addEventListener('input', (e) => {
  const f = e.target.closest('form[data-search]'); if (!f) return;
  clearTimeout(st); st = setTimeout(() => { state[f.dataset.search] = e.target.value; rerender(); const inp = document.querySelector(`form[data-search="${f.dataset.search}"] input`); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }, 250);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
// tooltips for chart points
const tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; document.body.appendChild(tip);
document.addEventListener('mousemove', (e) => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (!t) { tip.style.display = 'none'; return; }
  tip.textContent = t.getAttribute('data-tip'); tip.style.display = 'block';
  tip.style.left = Math.min(e.clientX + 12, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = e.clientY + 14 + 'px';
});
window.addEventListener('hashchange', () => { closeModal(); render(); window.scrollTo(0, 0); });
window.addEventListener('storage', (e) => { if (e.key && e.key.startsWith('kook.')) rerender(); });
setInterval(() => { const c = $('#clock'); if (c) c.textContent = `UTC ${state.date} ${new Date().toISOString().slice(11, 19)}`; }, 1000);

/* ---------------- boot ---------------- */
Promise.all(Object.entries(PATHS).map(([k, p]) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${p} → ${r.status}`); return r.text(); }).then((t) => [k, parseCSV(t)])))
  .then((pairs) => { buildModel(Object.fromEntries(pairs)); render(); })
  .catch((err) => {
    $('#app').innerHTML = `<div class="loading">Could not load data: ${esc(err.message)}<br><small>Serve the repository root over HTTP (e.g. <code>python3 -m http.server</code>) and open /dashboard/.</small></div>`;
    console.error(err);
  });
})();
