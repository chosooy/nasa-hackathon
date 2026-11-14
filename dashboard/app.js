/* KOOK dashboard — Crews A–D, November 2026. Layout follows Figma "최종" frames.
 * Data: ../data/calendar/events.csv, ../data/crew/{A,B,C,D}_hotdata.csv, ../data/biomarker/biomarker.csv,
 *       ../data/biomarker/raw biomarker.csv, ../data/health_instruction/health_instruction.csv
 */
(() => {
'use strict';

const ROOT = '..';
const PATHS = {
  events: `${ROOT}/data/calendar/events.csv`,
  crewA: `${ROOT}/data/crew/A_hotdata.csv`,
  crewB: `${ROOT}/data/crew/B_hotdata.csv`,
  crewC: `${ROOT}/data/crew/C_hotdata.csv`,
  crewD: `${ROOT}/data/crew/D_hotdata.csv`,
  rules: `${ROOT}/data/biomarker/biomarker.csv`,
  raw: `${ROOT}/data/biomarker/raw%20biomarker.csv`,
  instr: `${ROOT}/data/health_instruction/health_instruction.csv`,
};
const IMG = {
  A: `${ROOT}/assets/image/A_profile.png`,
  B: `${ROOT}/assets/image/B_profile.png`,
  C: `${ROOT}/assets/image/C_profile.png`,
  D: `${ROOT}/assets/image/D_profile.png`,
  logo: `${ROOT}/assets/logo/Logo_yellow%20ver..png`,
  earth: `${ROOT}/assets/background/Background_Earth.jpeg`,
  mars: `${ROOT}/assets/background/Background_Mars.jpeg`,
};
const MISSION_START = '2026-10-01';
const DATA_FIRST = '2026-11-01';
const DATA_LAST = '2026-11-30';
// Dashboard clock: real time folded into the Nov 1–30 data window, looping while the page is open.
const WINDOW_START = Date.UTC(2026, 10, 1);
const WINDOW_MS = 30 * 86400000;
const simNow = () => new Date(WINDOW_START + ((((Date.now() - WINDOW_START) % WINDOW_MS) + WINDOW_MS) % WINDOW_MS));
const simStamp = () => simNow().toISOString().slice(0, 19).replace('T', ' ');
let TODAY = simNow().toISOString().slice(0, 10);
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
  'Sleep Latency': 'Time to fall asleep',
  'Blood Urea Nitrogen': 'BUN',
  'RBC/HPF': 'Urine occult blood / RBC',
  'UACR': 'Urine albumin',
};
const SLEEP_CORE = ['Self-reported sleep quality', 'Total Sleep Time', 'Sleep Efficiency', 'Wake After Sleep Onset'];
const SLEEP_SUB = { 'Self-reported sleep quality': 'Your self-reported sleep quality', 'Total Sleep Time': 'Total sleep time · TST', 'Sleep Efficiency': 'Time asleep compared with time in bed · SE', 'Wake After Sleep Onset': 'Wake after sleep onset · WASO' };

/* ---------------- icons ---------------- */
const ICON = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.5h6V4M9 10h6M9 14h6"/></svg>',
  open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#07173F"/><path d="M7 6.5c1.6.4 2 1.6 3.4 1.7.9.1 1.1 1 .6 1.8-.7 1.1-2.4.6-3 1.9-.4 1 .5 2.4-.4 3.2-.6.5-1.7-.6-2.3-1.6A8 8 0 0 1 7 6.5zM14.6 4.5c.4 1 1.6 1.2 2.2 2 .8 1.1-.3 2.3.3 3.3.6 1 2 .8 2.7 1.8.3 2.2-.4 4.1-1.6 5.6-.6-.9-.4-2.3-1.4-2.9-1-.6-2.4.1-3-.9-.6-1 .7-2.2.1-3.2-.6-1-2.2-.9-2.5-2-.2-.9.7-1.9 1.6-2.2.5-.2 1.1-.6 1.6-1.5z" fill="#fff"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></svg>',
  tube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3h5M9 3v14a2.5 2.5 0 0 0 5 0V3"/><path d="M9 11h5"/><circle cx="18" cy="7" r="1.6"/></svg>',
  monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 10l2.5 2 3-4 2.5 3"/></svg>',
  device: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 14a5 5 0 1 1 9 3c-1 1.4-2.5 1.7-2.5 3.5a2 2 0 0 1-3.5 1.2"/><path d="M10 13a2 2 0 1 1 3.5 1.3M4.5 6.5A8 8 0 0 0 3 11"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  steth: (c = '#EAFE07') => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"><path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v3a5 5 0 0 0 10 0v-3"/><circle cx="20" cy="11" r="2"/></svg>`,
  astro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="9" r="6"/><ellipse cx="12" cy="9" rx="3.4" ry="2.4"/><path d="M6 22c0-3 2.7-5 6-5s6 2 6 5" stroke-linecap="round"/></svg>',
  planet: '<svg viewBox="0 0 24 24" fill="#07173F"><circle cx="12" cy="12" r="6"/></svg>',
  ev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></svg>',
  drop: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="12" r="4"/><circle cx="17" cy="8" r="3"/></svg>',
  walk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
};

/* ---------------- utils ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const DAY_MS = 86400000;
const toD = (s) => new Date(s + 'T00:00:00Z');
const fromD = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => fromD(new Date(toD(s).getTime() + n * DAY_MS));
const missionDay = (s) => Math.round((toD(s) - toD(MISSION_START)) / DAY_MS) + 1;
const pad3 = (n) => String(n).padStart(3, '0');
const dayLabel = (s) => `DAY ${pad3(missionDay(s))}`;
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (s) => { const d = toD(s); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
const shortDate = (s) => { const d = toD(s); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const weekday = (s) => WDL[toD(s).getUTCDay()];
const weekStart = (s) => addDays(s, -((toD(s).getUTCDay() + 6) % 7));
const clampData = (s) => (s < DATA_FIRST ? DATA_FIRST : s > DATA_LAST ? DATA_LAST : s);
const nice = (b) => FRIENDLY[b] || b;
const fixText = (s) => String(s || '').replace(/(\d)\?(\d)/g, '$1–$2').trim();
const store = {
  get(k, d) { try { const v = localStorage.getItem('kook.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('kook.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/* ---------------- thresholds: yellow column = Potential boundary, red column = Urgent ---------------- */
function parseRule(str) {
  if (!str || /B-?2SD/i.test(str)) return null;
  const parts = str.split(/\s+OR\s+/i).map((p) => {
    const t = p.replace(/,/g, '').trim();
    let m = t.match(/^(<=|>=|<|>|≤|≥)\s*(-?\d+(?:\.\d+)?)/);
    if (m) return { op: { '≤': '<=', '≥': '>=' }[m[1]] || m[1], v: +m[2] };
    m = t.match(/^(-?\d+(?:\.\d+)?)\s*[–—-]\s*(-?\d+(?:\.\d+)?)/);
    if (m) return { op: 'range', lo: +m[1], hi: +m[2] };
    return null;
  }).filter(Boolean);
  return parts.length ? parts : null;
}
const test1 = (p, v) => (p.op === 'range' ? v >= p.lo && v <= p.hi : p.op === '<' ? v < p.v : p.op === '<=' ? v <= p.v : p.op === '>' ? v > p.v : v >= p.v);
const matches = (rule, v) => rule.some((p) => test1(p, v));

/* ---------------- data model ---------------- */
const DB = { events: [], rules: {}, info: {}, raw: {}, crews: {}, cur: 'A' };
// Readings live per crew; the accessors below always point at the current crew (DB.cur).
['series', 'daily', 'continuous', 'bios'].forEach((k) => Object.defineProperty(DB, k, {
  get: () => (DB.crews[DB.cur] || { series: {}, daily: {}, continuous: new Set(), bios: [] })[k],
}));
/** Run fn with another crew's readings as the current data (restores the previous crew afterwards). */
function withCrew(c, fn) { const prev = DB.cur; DB.cur = c; try { return fn(); } finally { DB.cur = prev; } }
const hasCrew = (c) => !!DB.crews[c];
const statesFor = (c, date = state.date) => (hasCrew(c) ? withCrew(c, () => allStates(date)) : []);

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
  if (u === 'h per 24 h') u = 'h';
  if (b === 'RBC/HPF') u = '/HPF';
  if (b === 'WBC' || b === 'Platelets') u = '×10⁹/L';
  return u;
}
function fmt(v, b) {
  if (v == null) return '—';
  if (/min/.test(unitOf(b))) return Math.round(v).toString();
  if (Number.isInteger(v)) return String(v);
  const a = Math.abs(v);
  return a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : String(Math.round(v * 100) / 100);
}
const fmtU = (v, b) => { const u = unitOf(b); return `${fmt(v, b)}${u ? (u === '%' || u.startsWith('/') ? '' : ' ') + u : ''}`; };

function buildModel(raw) {
  DB.events = raw.events.map((e) => ({
    ...e,
    crews: e.crew.split(',').map((s) => s.trim()),
    hazards: e.hazard.split(',').map((s) => s.trim()).filter(Boolean).map((h) => (h === 'hostile' ? 'habitat' : h)),
  }));
  raw.rules.forEach((r) => { DB.rules[r.biomarker] = { yellow: parseRule(r.yellow), red: parseRule(r.red), yellowRaw: r.yellow, redRaw: r.red, unit: r.unit }; });
  raw.instr.forEach((r) => { DB.info[r.biomarker] = { ...r, summary: fixText(r.summary), hazards: (r.hazard || '').split(',').map((s) => s.trim()).filter(Boolean) }; });
  raw.raw.forEach((r) => { DB.raw[(r.Biomarker || '').trim()] = { earth: fixText(r.earth_space_comparison), numeric: fixText(r.Numeric_criteria_or_limitation), timing: fixText(r.Recommended_timing) }; });
  CREWS.forEach((c) => { if (raw['crew' + c]) DB.crews[c] = buildCrew(raw['crew' + c]); });
}
function buildCrew(rows) {
  const crew = { series: {}, daily: {}, continuous: new Set(), bios: [] };
  const s = {};
  rows.forEach((r) => {
    const v = parseFloat(r.figure);
    if (!r.biomarker || Number.isNaN(v)) return;
    (s[r.biomarker] = s[r.biomarker] || []).push({ date: r.date, time: r.time, v });
  });
  Object.entries(s).forEach(([b, arr]) => {
    arr.sort((a, z) => (a.date + a.time).localeCompare(z.date + z.time));
    crew.series[b] = arr;
    if (arr.length > 200) {
      crew.continuous.add(b);
      const by = {};
      arr.forEach((p) => {
        const d = (by[p.date] = by[p.date] || { sum: 0, n: 0, min: Infinity, max: -Infinity, flag: 0 });
        d.sum += p.v; d.n++; d.min = Math.min(d.min, p.v); d.max = Math.max(d.max, p.v);
        if (statusOf(b, p.v) !== 'normal') d.flag++;
      });
      Object.values(by).forEach((d) => { d.mean = d.sum / d.n; });
      crew.daily[b] = by;
    }
  });
  crew.bios = Object.keys(crew.series);
  return crew;
}
/** Latest reading at or before the dashboard's "now": the current sim time on today, end of day otherwise.
 *  Status, hazard board and instructions all use this latest reading. */
const cutoffFor = (date) => (date === TODAY ? simNow().toISOString().slice(11, 16) : '23:59');
function valueAt(b, date) {
  const cut = date + ' ' + cutoffFor(date);
  let hit = null;
  for (const p of DB.series[b]) { if (p.date + ' ' + p.time <= cut) hit = p; else break; }
  if (!hit) return null;
  if (DB.continuous.has(b)) {
    const d = DB.daily[b][hit.date];
    return { ...hit, n: d ? d.n : 1, flag: d ? d.flag : 0 };
  }
  return hit;
}
function dailyPoints(b, upto) {
  if (DB.continuous.has(b)) return Object.keys(DB.daily[b]).sort().filter((d) => d <= upto).map((d) => ({ date: d, v: DB.daily[b][d].mean }));
  const by = {};
  DB.series[b].forEach((p) => { if (p.date <= upto) by[p.date] = p.v; });
  return Object.keys(by).sort().map((d) => ({ date: d, v: by[d] }));
}
function bioState(b, date) {
  const r = valueAt(b, date);
  const info = DB.info[b] || {};
  const pts = DB.series[b] ? dailyPoints(b, date) : [];
  return {
    b, name: nice(b), r, v: r ? r.v : null, status: r ? statusOf(b, r.v) : 'nodata', info,
    category: info.category || 'Other', method: info.method || '', period: info.period || '', hazards: info.hazards || [],
    pts, flagged: pts.filter((p) => statusOf(b, p.v) !== 'normal').length,
  };
}
const allStates = (date) => DB.bios.map((b) => bioState(b, date)).sort((a, z) => SEV[z.status] - SEV[a.status] || a.name.localeCompare(z.name));
function instructionFor(s) {
  const i = s.info || {};
  if (s.status === 'urgent') return i.red_instruction || 'Notify the flight medical officer immediately.';
  if (s.status === 'potential') return i.yellow_instruction || 'Review this result with the flight medical officer.';
  if (s.status === 'nodata') return 'No reading has been recorded yet.';
  return 'No action is needed. Your value is within the normal range.';
}
function hazardStatus(states) {
  return HAZARDS.map((h) => {
    const hits = states.filter((s) => s.hazards.includes(h.key) && (s.status === 'urgent' || s.status === 'potential'));
    return { ...h, hits, status: hits.reduce((m, s) => (SEV[s.status] > SEV[m] ? s.status : m), 'normal') };
  });
}
const eventsFor = (crew, date) => DB.events.filter((e) => e.date === date && e.crews.includes(crew)).sort((a, z) => a.start_time.localeCompare(z.start_time));
const metaLine = (s) => (s.r ? `${dayLabel(s.r.date)} ${s.r.time} · ${s.category} · ${s.method}` : 'No reading yet');

/* ---------------- chat + notes (localStorage) ---------------- */
function seedChat() {
  const tst = withCrew('A', () => valueAt('Total Sleep Time', '2026-11-13'));
  return [
    { from: 'crew', date: '2026-11-13', time: '12:13', text: `I slept ${tst ? fmt(tst.v, 'Total Sleep Time') : '7.4'} hours last night and still feel tired. Could you check my sleep record?`, attach: `sleep check · ${dayLabel('2026-11-13')}` },
    { from: 'doctor', date: '2026-11-13', time: '12:25', text: "Thanks for sharing your record. I've received it. Please tell me how you're feeling now." },
    { from: 'crew', date: '2026-11-13', time: '12:30', text: "I'm still feeling tired. I've opened the saved sleep guidance." },
  ];
}
// One conversation and one notes list per crew; default = the crew currently rendered (DB.cur).
const chat = (c = DB.cur) => store.get('chat' + c, null) || (c === 'A' ? seedChat() : []);
function sendChat(from, text, attach, c = DB.cur) {
  text = text.trim(); if (!text) return;
  const msgs = chat(c);
  msgs.push({ from, date: state.date, time: new Date().toISOString().slice(11, 16), text, attach: attach || undefined });
  store.set('chat' + c, msgs);
}
const notes = (c = DB.cur) => store.get('notes' + c, []);
/** Doctor edits to summaries / instructions (kept in localStorage) layered over health_instruction.csv. */
function applyEdits() {
  Object.entries(store.get('edits', {})).forEach(([b, e]) => { if (DB.info[b]) Object.assign(DB.info[b], e); });
}
const libExtra = () => store.get('library', []);

/* ---------------- charts ---------------- */
const ZC = { urgent: '#FDE7DF', potential: '#F4FFB0', normal: '#E6EEF8' };
const ZL = { urgent: '#E43700', potential: '#C27400', normal: '#0042A6' };
// Line colours per segment: deep red / deep yellow where readings are Urgent / Potential.
const LINE = { urgent: '#C21F00', potential: '#C9A100' };
function statusLine(b, pts, X, Y, base, width) {
  let g = '';
  for (let i = 1; i < pts.length; i++) {
    const a = statusOf(b, pts[i - 1].v), z = statusOf(b, pts[i].v);
    const st = SEV[a] >= SEV[z] ? a : z;
    g += `<line x1="${X(i - 1).toFixed(1)}" y1="${Y(pts[i - 1].v).toFixed(1)}" x2="${X(i).toFixed(1)}" y2="${Y(pts[i].v).toFixed(1)}" stroke="${LINE[st] || base}" stroke-width="${width}" stroke-linecap="round"/>`;
  }
  if (pts.length === 1) g += `<circle cx="${X(0)}" cy="${Y(pts[0].v)}" r="3" fill="${LINE[statusOf(b, pts[0].v)] || base}"/>`;
  // invisible hover targets for the tooltip
  pts.forEach((p, i) => { g += `<circle cx="${X(i)}" cy="${Y(p.v)}" r="6" fill="transparent" data-tip="${esc(`${p.label || dayLabel(p.date)} · ${fmtU(p.v, b)} · ${SEV_LABEL[statusOf(b, p.v)]}`)}"/>`; });
  return g;
}
function zoneBands(b, lo, hi, n = 90) {
  const out = []; const step = (hi - lo) / n;
  for (let i = 0; i < n; i++) {
    const a = lo + i * step, z = a + step, st = statusOf(b, (a + z) / 2);
    const last = out[out.length - 1];
    if (last && last.st === st) last.hi = z; else out.push({ st, lo: a, hi: z });
  }
  return out;
}
function yRange(b, vs, withZones) {
  let lo = Math.min(...vs), hi = Math.max(...vs);
  const r = DB.rules[b];
  if (withZones && r) {
    const ths = [...(r.yellow || []), ...(r.red || [])].flatMap((p) => (p.op === 'range' ? [p.lo, p.hi] : [p.v]));
    const sp = hi - lo || 1;
    const near = ths.filter((t) => t >= lo - sp * 1.5 && t <= hi + sp * 1.5);
    if (near.length) { lo = Math.min(lo, ...near); hi = Math.max(hi, ...near); }
  }
  const span = hi - lo || Math.abs(hi) * 0.1 || 1;
  return [lo - span * 0.12, hi + span * 0.12];
}
/** Detail chart: zone bands + right-side zone labels (Figma "My past record"). */
function zoneChart(b, pts, w = 600, h = 250) {
  if (!pts.length) return '<div class="empty">No readings yet.</div>';
  const P = { l: 34, r: 92, t: 10, b: 28 };
  const [lo, hi] = yRange(b, pts.map((p) => p.v), true);
  const X = (i) => P.l + (pts.length === 1 ? (w - P.l - P.r) / 2 : (i / (pts.length - 1)) * (w - P.l - P.r));
  const Y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (h - P.t - P.b);
  let g = '';
  const bands = DB.rules[b] ? zoneBands(b, lo, hi) : [{ st: 'normal', lo, hi }];
  bands.forEach((z) => {
    g += `<rect x="${P.l}" y="${Y(z.hi)}" width="${w - P.l - P.r}" height="${Math.max(0, Y(z.lo) - Y(z.hi))}" fill="${ZC[z.st]}"/>`;
    if (Y(z.lo) - Y(z.hi) > 14) {
      g += `<line x1="${w - P.r + 8}" x2="${w - P.r + 8}" y1="${Y(z.hi) + 1}" y2="${Y(z.lo) - 1}" stroke="${ZL[z.st]}" stroke-width="2"/>`;
      g += `<text x="${w - P.r + 14}" y="${(Y(z.hi) + Y(z.lo)) / 2 + 3}" font-size="9.5" font-weight="600" fill="${ZL[z.st]}">${SEV_LABEL[z.st]} zone</text>`;
    }
  });
  for (let i = 1; i < bands.length; i++) {
    const y = Y(bands[i].lo);
    g += `<line x1="${P.l}" x2="${w - P.r}" y1="${y}" y2="${y}" stroke="#9CA7B8" stroke-dasharray="3 3" stroke-width=".8"/><text x="${P.l - 5}" y="${y + 3}" font-size="9" fill="#5F6D88" text-anchor="end">${fmt(bands[i].lo, b)}</text>`;
  }
  const idx = [...new Set([0, Math.round((pts.length - 1) / 3), Math.round((2 * (pts.length - 1)) / 3), pts.length - 1])];
  idx.forEach((i) => { g += `<text x="${X(i)}" y="${h - 9}" font-size="9" fill="#9CA7B8" text-anchor="middle">${esc(pts[i].label || dayLabel(pts[i].date))}</text>`; });
  g += statusLine(b, pts, X, Y, '#07173F', 2);
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(nice(b))} past record">${g}</svg>`;
}
/** Area chart: blue gradient fill, flagged points coloured (Figma doctor home / crew page). */
let gid = 0;
function areaChart(b, pts, { w = 400, h = 220, axis = true } = {}) {
  if (!pts.length) return '<div class="empty">No readings yet.</div>';
  const id = 'g' + (++gid);
  const P = axis ? { l: 30, r: 8, t: 10, b: 22 } : { l: 3, r: 3, t: 6, b: 4 };
  const [lo, hi] = yRange(b, pts.map((p) => p.v), false);
  const X = (i) => P.l + (pts.length === 1 ? (w - P.l - P.r) / 2 : (i / (pts.length - 1)) * (w - P.l - P.r));
  const Y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (h - P.t - P.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  let g = `<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#A8C8FF" stop-opacity=".6"/><stop offset="1" stop-color="#A8C8FF" stop-opacity="0"/></linearGradient></defs>`;
  // Zone backgrounds (Normal / Potential / Urgent) behind the line so states read at a glance.
  const banded = !!DB.rules[b];
  if (banded) {
    zoneBands(b, lo, hi).forEach((z) => {
      const top = Math.max(P.t, Y(z.hi)), bot = Math.min(h - P.b, Y(z.lo));
      if (bot > top) g += `<rect x="${P.l}" y="${top}" width="${w - P.l - P.r}" height="${bot - top}" fill="${ZC[z.st]}"/>`;
    });
  }
  if (axis) {
    for (let i = 0; i <= 3; i++) { const v = lo + ((hi - lo) * i) / 3; g += `<text x="${P.l - 4}" y="${Y(v) + 3}" font-size="8.5" fill="#9CA7B8" text-anchor="end">${fmt(v, b)}</text>`; }
    [0, Math.round((pts.length - 1) / 2), pts.length - 1].forEach((i) => { g += `<text x="${X(i)}" y="${h - 6}" font-size="8.5" fill="#9CA7B8" text-anchor="middle">${dayLabel(pts[i].date)}</text>`; });
  }
  if (!banded) g += `<path d="${line}L${X(pts.length - 1)},${h - P.b}L${X(0)},${h - P.b}Z" fill="url(#${id})"/>`;
  g += statusLine(b, pts, X, Y, '#0042A6', axis ? 2 : 1.8);
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="none" style="display:block">${g}</svg>`;
}

function donutSvg(hz, size, centerSvg) {
  const big = size > 120;
  const C = size / 2, R = size * (big ? 0.37 : 0.34), T = size * (big ? 0.15 : 0.105);
  const col = { urgent: '#E43700', potential: '#EAFE07', normal: '#A8C8FF' };
  const pt = (a, r) => [C + r * Math.cos((a * Math.PI) / 180), C + r * Math.sin((a * Math.PI) / 180)];
  let g = '';
  hz.forEach((h, i) => {
    const a0 = -90 + i * 72 + 3, a1 = a0 + 66;
    const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
    g += `<path d="M${x0},${y0}A${R},${R} 0 0 1 ${x1},${y1}" fill="none" stroke="${col[h.status]}" stroke-width="${T}" data-tip="${esc(`${h.label}: ${h.hits.length ? h.hits.map((s) => s.name).join(', ') : 'All normal'}`)}"/>`;
    if (big) {
      // Hazard name written along the segment; bottom segments run the other way so text stays upright.
      const id = `hzt${i}`, mid = ((a0 + a1) / 2) * Math.PI / 180, flip = false;
      const [sx, sy] = pt(flip ? a1 : a0, R), [ex, ey] = pt(flip ? a0 : a1, R);
      g += `<path id="${id}" d="M${sx},${sy}A${R},${R} 0 0 ${flip ? 0 : 1} ${ex},${ey}" fill="none"/>`;
      g += `<text font-size="${size * 0.046}" font-weight="700" fill="${h.status === 'urgent' ? '#fff' : '#07173F'}" dominant-baseline="central"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${h.label}</textPath></text>`;
    }
  });
  g += `<circle cx="${C}" cy="${C}" r="${R - T * 0.8}" fill="#07173F"/>${centerSvg(C, R - T * 0.8)}`;
  return g;
}
function hazardBoard(states) {
  const size = 260;
  const hz = hazardStatus(states);
  // Centre of the ring: the crew member's profile photo.
  const inner = donutSvg(hz, size, (C, r) => `<clipPath id="hzface"><circle cx="${C}" cy="${C}" r="${r}"/></clipPath><image href="${IMG[DB.cur]}" x="${C - r}" y="${C - r}" width="${r * 2}" height="${r * 2 * 1.33}" preserveAspectRatio="xMidYMin slice" clip-path="url(#hzface)"/>`);
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" width="100%" style="max-width:${size}px" role="img" aria-label="Hazard board">${inner}</svg>`;
}
function miniDonut(states, c) {
  const size = 92;
  const hz = states ? hazardStatus(states) : HAZARDS.map((h) => ({ ...h, status: 'normal', hits: [] }));
  const center = (C, r) => `<clipPath id="cl${c}"><circle cx="${C}" cy="${C}" r="${r}"/></clipPath><image href="${IMG[c]}" x="${C - r}" y="${C - r}" width="${r * 2}" height="${r * 2 * 1.33}" preserveAspectRatio="xMidYMin slice" clip-path="url(#cl${c})"/>`;
  return `<svg viewBox="0 0 ${size} ${size}" width="78" height="78" aria-hidden="true">${donutSvg(hz, size, center)}</svg>`;
}
function todayArt() {
  return `<svg class="art" viewBox="0 0 170 170" aria-hidden="true"><circle cx="85" cy="95" r="75" fill="#EAFE07"/>
    <circle cx="58" cy="46" r="7" fill="none" stroke="#07173F" stroke-width="2"/><circle cx="104" cy="30" r="5" fill="none" stroke="#07173F" stroke-width="2"/><circle cx="128" cy="56" r="4" fill="none" stroke="#07173F" stroke-width="2"/>    <path d="M25 112c14-4 22 6 36 2s20-10 34-6 18 10 30 6" fill="none" stroke="#07173F" stroke-width="2.2" stroke-linecap="round"/></svg>`;
}

/* ---------------- state + routing ---------------- */
const state = { date: TODAY, week: weekStart(TODAY), hazardFilter: 'all', instrFilter: 'all', attFilter: 'all', query: '', libFilter: 'all', libQuery: '', bioCat: 'All', carousel: 0, docCrew: 'A', calStart: TODAY, me: CREWS.includes(store.get('me', 'A')) ? store.get('me', 'A') : 'A' };
const setDate = (d) => { state.date = clampData(d); state.week = weekStart(state.date); state.calStart = state.date; };
function route() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), qs: new URLSearchParams(qs || '') };
}

/* ---------------- shell ---------------- */
function topbar(role, active) {
  const base = role === 'crew' ? '#/crew' : '#/doctor';
  return `<header class="topbar">
    <a class="logo" href="#/" aria-label="KOOK"><img src="${IMG.logo}" alt="KOOK"></a>
    <nav><a href="${base}" class="${active === 'home' ? 'active' : ''}">Overview</a><a href="${base}/instructions" class="${active === 'instr' ? 'active' : ''}">Health Instruction</a></nav>
    <span class="spacer"></span>
    <span class="meta live-clock">UTC ${simStamp()}</span>
    <span class="meta live-sol">SOL ${pad3(missionDay(TODAY))}</span>
    <a class="role-pill" href="${role === 'crew' ? '#/doctor' : '#/crew'}" title="Switch workspace">${role === 'crew' ? 'SPACE / Astronaut' : 'EARTH / Doctor'}</a>
    <a class="profile-link" href="${base}/profile">Profile</a>
  </header>`;
}
function fab(role) {
  if (role === 'doctor' && ['instructions', 'bio'].includes(route().parts[1])) { $('#fab-root').innerHTML = ''; return; }
  $('#fab-root').innerHTML = role === 'crew'
    ? `<a class="fab" href="#/crew/chat">${ICON.chat}Ground Doctor</a>`
    : `<a class="fab" href="#/doctor/chat">${ICON.chat}Crew conversation</a>`;
}
const searchBar = (key, placeholder, button) => `<form class="search" data-search="${key}"><label class="field">${ICON.search}<input name="q" value="${esc(state[key])}" placeholder="${esc(placeholder)}"></label>${button ? `<button class="go" type="submit">${ICON.search}Search</button>` : ''}</form>`;

/* ---------------- shared widgets ---------------- */
function weekCalendar(crew, dayHref) {
  const focus = state.date;
  const days = [...Array(29)].map((_, i) => addDays(focus, i + 1));   // six visible, scroll sideways for later dates
  // Hazard tags use the crew's current state: Normal blue, Potential neon yellow, Urgent red.
  const hzSt = Object.fromEntries((hasCrew(crew) ? hazardStatus(statesFor(crew)) : []).map((h) => [h.key, h.status]));
  const chips = ['all', ...HAZARDS.map((h) => h.key)].map((k) => {
    const sev = k !== 'all' && hzSt[k] ? `hz-${hzSt[k]}` : '';
    return `<button class="chip ${sev} ${state.hazardFilter === k ? 'on' : ''}" data-hz="${k}">${k === 'all' ? 'All' : HAZARDS.find((h) => h.key === k).label}</button>`;
  }).join('');
  const evCard = (e) => {
    const dim = state.hazardFilter !== 'all' && !e.hazards.includes(state.hazardFilter);
    // Card tint = most severe state among the event's hazards (Urgent > Potential > Normal).
    const evSt = e.hazards.map((h) => hzSt[h]).filter(Boolean).reduce((m, x) => (SEV[x] > SEV[m] ? x : m), 'nodata');
    return `<div class="ev st-${evSt} ${dim ? 'dim' : ''}" title="${esc(`${e.start_time}–${e.end_time} · ${e.title} · ${e.category} · ${e.hazards.join(', ')}`)}"><div class="t">${e.start_time}</div><div class="tt">${esc(e.title)}</div></div>`;
  };
  // Every event is listed; each day card scrolls inside itself.
  const evList = (evs) => evs.map(evCard).join('');
  const fEvs = eventsFor(crew, focus);
  const big = `<div class="big-day">
      <div class="bd-head"><div class="lbl">${focus === TODAY ? 'TODAY' : weekday(focus).toUpperCase()}</div><div class="big">${dayLabel(focus)}</div><div class="dt">${weekday(focus)}, ${shortDate(focus)}</div></div>
      <div class="bd-list">${fEvs.length ? evList(fEvs) : '<div class="ev-more">No scheduled activities.</div>'}</div>
      <a class="page-btn light" href="${dayHref(focus)}">View page ›</a>
    </div>`;
  const cols = days.map((d) => {
    const evs = eventsFor(crew, d);
    return `<div class="dayc"><div class="dn">${WD[toD(d).getUTCDay()]} ${String(toD(d).getUTCDate()).padStart(2, '0')}</div><div class="dd">${dayLabel(d)}</div><div class="dc-list">${evList(evs)}</div></div>`;
  }).join('');
  return `<div class="strip">${big}<div class="strip-right"><div class="chips cal-tags">${chips}</div><div class="week six">${cols}</div></div></div>`;
}
function chatLog(role, mini) {
  const msgs = mini ? chat().slice(-2) : chat();
  let lastDate = '';
  return msgs.map((m) => {
    const me = m.from === role;
    let sep = '';
    if (!mini && m.date !== lastDate) { sep = `<div class="daysep">${weekday(m.date)}, ${shortDate(m.date)} · ${m.date === '2026-11-13' ? 'Demo conversation' : dayLabel(m.date)}</div>`; lastDate = m.date; }
    const who = me ? (role === 'crew' ? 'You' : 'You — Ground doctor') : (role === 'crew' ? 'Ground doctor' : `Crew ${DB.cur}`);
    // Figma: doctor messages are bubbles (blue for the doctor's own view, white for crew); crew messages are plain text in the full chat.
    let cls = '';
    if (mini) cls = me ? 'bubble blue' : 'bubble';
    else if (m.from === 'doctor') cls = role === 'doctor' ? 'bubble blue' : 'bubble';
    const status = me ? 'Delivered' : (m.from === 'doctor' ? 'Example physician reply' : 'Delivered');
    return `${sep}<div class="msg ${cls} ${me ? 'right' : ''}"><div class="who">${who}</div>${esc(m.text)}<div class="meta">${dayLabel(m.date)} ${m.time} · ${status}</div></div>${m.attach && !mini ? `<div class="attach" style="align-self:${me ? 'flex-end' : 'flex-start'}">Attached: ${esc(m.attach)}</div>` : ''}`;
  }).join('');
}
function chatCard(role, mini) {
  const crewSide = role === 'crew';
  const head = crewSide
    ? `<div><b>Ground doctor</b><small>Flight care team · 1:1 chat</small></div>`
    : `<img class="avatar" src="${IMG[DB.cur]}" alt="Crew ${DB.cur}" style="width:40px;height:40px"><div><b>Crew ${DB.cur}</b><small>Crew ${DB.cur} · 1:1 conversation</small></div>`;
  return `<section class="card chat ${mini ? 'mini' : ''}">
    <div class="chat-head">${head}${mini ? '' : '<span class="dots">···</span>'}</div>
    <div class="log" id="chatlog">${mini ? '' : `<div class="note">Messages may take time to reach ${crewSide ? 'Earth' : 'the crew'}. We'll show you when they arrive.</div>`}${chatLog(role, mini)}</div>
    <form class="compose" data-chat="${role}" data-crew="${DB.cur}"><button type="button" class="plus" data-attach-note aria-label="Attach a file">+</button><input name="m" placeholder="Write a message to ${crewSide ? 'your doctor' : `Crew ${DB.cur}`}…" autocomplete="off"><button class="btn primary" type="submit">Send${mini ? '' : ' ' + ICON.send}</button></form>
  </section>`;
}
const statusRow = (s, href) => `<a class="row" href="${href}" title="${esc(s.info.summary || '')}"><div class="nm"><b>${esc(s.name)}</b><small>${esc(metaLine(s))}</small></div><span class="val">${esc(fmt(s.v, s.b))}${unitOf(s.b) ? `<small>${esc(unitOf(s.b))}</small>` : ''}</span><span class="badge ${s.status}">${SEV_LABEL[s.status]}</span></a>`;

/* ================= CREW (SPACE) ================= */
// Crew home "Health Instruction" card: every measured biomarker, Urgent > Potential > Normal.
function crewInstructionItems(states) {
  return states.filter((s) => s.status !== 'nodata').map((s) => ({
    kind: 'care',
    text: s.name + s.category + instructionFor(s),
    html: `<a class="item care ${s.status}" href="#/crew/bio/${enc(s.b)}"><div class="ttl">${esc(s.name)} · ${SEV_LABEL[s.status]}</div><div class="desc">${esc(instructionFor(s))}</div><div class="foot">${dayLabel(s.r.date)} ${s.r.time} · ${esc(fmtU(s.v, s.b))} · ${esc(s.category)}</div></a>`,
  }));
}
function instrChips() {
  return [['all', 'All'], ['health', 'My health'], ['notes', "Doctor's notes"], ['care', 'Care guidance']].map(([k, l]) => `<button class="chip ${state.instrFilter === k ? 'on' : ''}" data-if="${k}">${l}</button>`).join('');
}
function filteredInstr(states) {
  const q = state.query.toLowerCase();
  return crewInstructionItems(states).filter((i) => !q || i.text.toLowerCase().includes(q)).map((i) => i.html).join('') || `<div class="empty">${q ? 'Nothing matches your search.' : 'No care guidance right now — everything is normal.'}</div>`;
}

// Health Instruction page: no tag filter, only the instruction list.
function allInstr(states) {
  return crewInstructionItems(states).map((i) => i.html).join('');
}

function crewHome() {
  const d = state.date;
  const states = allStates(d);
  const n = states.filter((s) => s.status === 'urgent' || s.status === 'potential').length;
  return `${topbar('crew', 'home')}<main class="page">
    <section class="hero-crew"><div class="planet"></div>
      <span class="chip-day"><i>${ICON.planet}</i>${dayLabel(d)} · MARS</span>
      <h1 class="hero-title">Welcome back, <b>Crew ${DB.cur}</b></h1>
      <p class="hero-sub">${weekday(d)}, ${shortDate(d)}<span class="bar">|</span>${n} thing${n === 1 ? '' : 's'} to check in your health today</p>
    </section>
    <section class="card" style="margin-bottom:16px;padding:20px">
      ${weekCalendar(DB.cur, (x) => `#/crew/day/${x}`)}
    </section>
    <div class="grid g-home">
      <section class="card home-instr">
        <div class="card-head" style="margin-bottom:12px"><h3>Health Instruction</h3><a class="chev" href="#/crew/instructions" aria-label="Open Health Instruction">›</a></div>
        ${searchBar('query', 'Search a symptom or a biomarker…', false)}
        <div class="items">${filteredInstr(states)}</div>
      </section>
      <section class="card home-hazard"><div class="card-head"><h3>My hazard board</h3><div class="legend"><span><i class="dot sky"></i>Normal</span><span><i class="dot potential"></i>Potential</span><span><i class="dot urgent"></i>Urgent</span></div></div><div class="hazard-wrap">${hazardBoard(states)}</div>
        <div class="crew-bio">${biomarkerCarousel({ ranked: states.filter((s) => s.status !== 'nodata'), bioBase: '#/crew/bio', title: 'My biomarkers', emptyText: 'No biomarker readings yet.' })}</div></section>
    </div>
  </main>`;
}
function crewInstructions() {
  const states = allStates(state.date);
  return `${topbar('crew', 'instr')}<main class="page dark">
    <h1 class="page-title" style="margin-bottom:20px">Health Instruction</h1>
    <form class="search" data-goto="#/crew/attention"><label class="field">${ICON.search}<input name="q" value="${esc(state.query)}" placeholder="Search a symptom, a health check or a doctor's note…"></label><button class="go" type="submit">${ICON.search}Search</button></form>
    <section class="card" style="margin-top:20px"><h3 style="margin-bottom:16px">Helpful for you right now</h3><div class="items">${allInstr(states)}</div></section>
  </main>`;
}
function attentionPage(role) {
  const base = role === 'crew' ? '#/crew' : '#/doctor';
  const states = allStates(state.date).filter((s) => s.status !== 'nodata');
  const q = state.query.toLowerCase();
  const match = (s) => !q || (s.name + s.b + s.category + (s.info.summary || '')).toLowerCase().includes(q);
  const cnt = (k) => states.filter((s) => s.status === k).length;
  const list = ['urgent', 'potential', 'normal'].filter((k) => state.attFilter === 'all' || state.attFilter === k).map((k) => {
    const ss = states.filter((s) => s.status === k && match(s));
    if (!ss.length) return '';
    if (k === 'normal') {
      return `<div class="sev-h normal">NORMAL · ${ss.length}</div><div class="normal-grid">${ss.map((s) => `<a class="nrow" href="${base}/bio/${enc(s.b)}"><div class="nm"><b>${esc(s.name)}</b><small>${esc(s.category)} · ${esc(s.method)}</small></div><div class="v">${esc(fmtU(s.v, s.b))}<small>${dayLabel(s.r.date)} · ${s.r.time} UTC</small></div><span class="chev">›</span></a>`).join('')}</div>`;
    }
    const raw = (s) => (DB.raw[s.b] || {}).numeric;
    return `<div class="sev-h ${k}">${k.toUpperCase()} · ${ss.length}</div>${ss.map((s) => `<a class="alert" href="${base}/bio/${enc(s.b)}">
      <div class="top"><div class="nm"><h4>${esc(s.name)}</h4><small>${esc(s.category)} · ${esc(s.method)}</small></div><div class="v">${esc(fmtU(s.v, s.b))}<small style="color:var(--navy-400)">${dayLabel(s.r.date)} · ${s.r.time} UTC</small></div><span class="chev">›</span></div>
      <div class="body ${k}"><div class="k">${k === 'urgent' ? 'DO THIS NOW' : 'WHAT TO DO'}</div>${esc(instructionFor(s))}${k === 'urgent' && raw(s) ? `<div class="rec"><b>${esc(raw(s))}</b><span class="hint">General recommendation</span></div>` : ''}</div></a>`).join('')}`;
  }).join('');
  const chip = (k, l) => `<button class="chip ${state.attFilter === k ? 'on' : ''}" data-af="${k}"><i class="dot ${k}"></i>${l}<span class="n">${cnt(k)}</span></button>`;
  return `${topbar(role, 'instr')}<main class="page dark">
    <h1 class="page-title">Health Instruction</h1>
    <p class="page-sub">${role === 'crew' ? 'Your biomarkers, most urgent first. Tap one to see what it means and your past records.' : `Crew ${DB.cur}'s biomarkers, most urgent first. Tap one to see the guidance and past records.`}</p>
    ${searchBar('query', 'Search a biomarker, a category or a symptom…', true)}
    <div class="chips"><button class="chip ${state.attFilter === 'all' ? 'light' : ''}" data-af="all">All<span class="n">${states.length}</span></button>${chip('urgent', 'Urgent')}${chip('potential', 'Potential')}${chip('normal', 'Normal')}</div>
    ${role === 'crew' && notes().length && state.attFilter === 'all' ? `<div class="sev-h notes">DOCTOR'S NOTES · ${notes().length}</div>${notes().slice().reverse().map((n) => `<div class="alert"><div class="top"><div class="nm"><div class="lbl" style="color:var(--electric)">GROUND DOCTOR</div><h4>${esc(n.title)}</h4><small>${n.bio ? esc(nice(n.bio)) + ' · ' : ''}${dayLabel(n.date)} ${n.time} UTC</small></div></div><div class="body" style="background:var(--blue-tint)"><div class="k">INSTRUCTION</div>${esc(n.text)}</div></div>`).join('')}` : ''}
    ${list || '<div class="empty">Nothing matches your search.</div>'}
  </main>`;
}
function dayPage(role, date, crew = 'A') {
  date = clampData(date);
  const states = allStates(date);
  const crewSide = role === 'crew';
  const dayBase = crewSide ? '#/crew/day' : `#/doctor/day/${crew}`;
  const bioBase = crewSide ? '#/crew/bio' : '#/doctor/bio';
  const tst = valueAt('Total Sleep Time', date);
  const ok = tst && tst.date === date;
  const st = ok ? statusOf('Total Sleep Time', tst.v) : 'nodata';
  const core = SLEEP_CORE.map((b) => states.find((s) => s.b === b)).filter(Boolean);
  const evs = eventsFor(crew, date);
  // Other health checks: Urgent > Potential > Normal (states are already severity-sorted).
  const others = states.filter((s) => !SLEEP_CORE.includes(s.b) && s.status !== 'nodata');
  const bySev = ['urgent', 'potential', 'normal'].map((k) => [k, others.filter((s) => s.status === k)]).filter(([, ss]) => ss.length);
  const msg = { normal: ['Your sleep looks normal', 'Sleep time is within the normal range.'], potential: ['Your sleep needs attention', 'Sleep time is outside the normal range.'], urgent: ['Your sleep is severely short', 'Sleep time is in the urgent range.'], nodata: ['No sleep record yet', 'Sleep is recorded each morning at 07:00.'] }[st];
  const coreRow = (s) => `<a class="row" href="${bioBase}/${enc(s.b)}"><div class="nm"><b>${esc(s.name)}</b><small>${s.r ? `${dayLabel(s.r.date)} ${s.r.time} · ${SLEEP_SUB[s.b]}` : 'No reading yet'}</small></div><span class="val">${esc(fmt(s.v, s.b))}${unitOf(s.b) && unitOf(s.b) !== '%' ? ` <small>${esc(unitOf(s.b))}</small>` : unitOf(s.b)}</span><span class="badge ${s.status}">${SEV_LABEL[s.status]}</span></a>`;
  return `${topbar(role, 'home')}<main class="page">
    <a class="back" data-back href="${crewSide ? '#/crew' : `#/doctor/crew/${crew}`}" aria-label="Back" title="Back">←</a>
    <div class="dayhead"><div class="big">${dayLabel(date)}</div><div><div class="dw">${weekday(date).toUpperCase()}</div><div class="dt">${longDate(date)}</div></div>
      <div class="nav"><a class="arrow" href="${dayBase}/${addDays(date, -1)}" aria-label="Previous day" ${date <= DATA_FIRST ? 'style="visibility:hidden"' : ''}>‹</a><a class="arrow" href="${dayBase}/${addDays(date, 1)}" aria-label="Next day" ${date >= DATA_LAST ? 'style="visibility:hidden"' : ''}>›</a></div></div>
    <section class="sleep-sum"><span class="pill">${msg[0]}</span><h3>${ok ? `${crewSide ? 'You' : `Crew ${crew}`} slept ${fmt(tst.v, 'Total Sleep Time')} hours last night.` : 'Sleep not recorded yet.'}</h3><p class="hint">${msg[1]}</p></section>
    <div class="stack">
        <section class="card"><h3>${crewSide ? 'Your health checks' : 'Health checks'}</h3><p class="hint" style="margin:2px 0 14px">Every record includes its measurement time.</p><div class="items">${core.map(coreRow).join('')}</div></section>
        <section class="card"><h3 style="margin-bottom:12px">${crewSide ? 'Your activities' : 'Activities'}</h3><div class="acts">${evs.map((e) => `<span><b>${e.start_time}</b>${esc(e.title)}</span>`).join('') || '<span class="hint">No scheduled activities.</span>'}</div></section>
        <section class="card"><h3>Other health checks</h3><p class="hint" style="margin-top:2px">Ordered Urgent › Potential › Normal. Hover a name to see what it measures.</p>
          ${bySev.map(([k, ss]) => `<div class="grp">${SEV_LABEL[k]} · ${ss.length}</div><div class="items">${ss.map((s) => statusRow(s, `${bioBase}/${enc(s.b)}`)).join('')}</div>`).join('')}</section>
    </div>
  </main>`;
}
/** Chart points for one biomarker up to the selected date (hourly means for continuous vitals). */
function recordPoints(b) {
  if (!DB.series[b]) return [];
  if (DB.continuous.has(b)) {
    const by = {};
    DB.series[b].forEach((p) => { if (p.date <= state.date) { const k = p.date + ' ' + p.time.slice(0, 2); (by[k] = by[k] || []).push(p.v); } });
    return Object.keys(by).sort().slice(-24 * 7).map((k) => ({ date: k.slice(0, 10), v: by[k].reduce((a, z) => a + z, 0) / by[k].length, label: `${dayLabel(k.slice(0, 10))} ${k.slice(11)}h` }));
  }
  return DB.series[b].filter((p) => p.date <= state.date).map((p) => ({ date: p.date, v: p.v }));
}
const summaryCard = (s) => `<section class="card detail-summary"><h3>Summary</h3><p>${esc(s.info.summary || '—')}</p>
  <div class="sum-meta"><span><b>Category</b>${esc(s.category)}</span><span><b>Method</b>${esc(s.method || '—')}</span><span><b>Hazards</b>${esc(s.hazards.join(', ') || '—')}</span></div></section>`;
const measureRow = (s, b) => { const raw = DB.raw[b] || {}; return `<div class="detail-row">
  <section class="card measure"><h3>Measure period</h3>
    <div class="k">CRITERIA</div><p>${esc(raw.numeric || (DB.rules[b] ? `${DB.rules[b].yellowRaw} normal; ${DB.rules[b].redRaw} urgent` : '—'))}</p>
    <div class="k">RECOMMENDED TIMING</div><p>${esc(raw.timing || s.period || '—')}</p></section>
  <section class="earth-space"><div class="track"><img src="${IMG.earth}" alt=""><i></i><img src="${IMG.mars}" alt=""></div><h4>Earth vs space</h4><p>${esc(raw.earth || 'Compare in-flight values with the preflight baseline.')}</p></section>
</div>`; };

function bioPage(role, b) {
  if (role === 'doctor') return doctorBioPage(b);
  const s = bioState(b, state.date);
  const cont = DB.continuous.has(b);
  const info = s.info;
  return `${topbar('crew', 'instr')}<main class="page">
    <a class="back" data-back href="#/crew/instructions" aria-label="Back" title="Back">←</a>
    <div class="title-row"><h1 class="page-title" style="margin:0">${esc(s.name)}</h1><span class="badge solid ${s.status === 'urgent' ? '' : s.status}">${SEV_LABEL[s.status]}</span></div>
    <div style="height:20px"></div>
    ${summaryCard(s)}
    <div class="detail-row">
      <section class="card"><h3 style="margin-bottom:12px">My past record</h3>${zoneChart(b, recordPoints(b))}</section>
      <section class="do-now ${s.status}">
        <div class="k">${s.status === 'urgent' ? 'DO THIS NOW' : s.status === 'potential' ? 'WHAT TO DO' : 'YOUR STATUS'}</div>
        <p>${esc(instructionFor(s))}</p>
        <div class="rec"><b>Latest reading: ${esc(fmtU(s.v, b))}</b><span class="hint">${s.r ? `${dayLabel(s.r.date)} ${s.r.time} UTC${cont ? ' · most recent 5-minute reading' : ''}` : 'Not measured yet'}</span></div>
        <details><summary>Guidance by state</summary>${info.yellow_instruction ? `<p><b>Potential —</b> ${esc(info.yellow_instruction)}</p>` : ''}${info.red_instruction ? `<p><b>Urgent —</b> ${esc(info.red_instruction)}</p>` : ''}</details>
      </section>
    </div>
    ${measureRow(s, b)}
  </main>`;
}

/** Doctor's biomarker page: Summary, a crew record you can page through (Crew A → D), and both instructions. */
function doctorBioPage(b) {
  const crew = CREWS[((state.recCrew || 0) % CREWS.length + CREWS.length) % CREWS.length];
  const s = bioState(b, state.date);                       // static info (summary, instructions)
  const has = hasCrew(crew) && withCrew(crew, () => !!DB.series[b]);
  const cs = has ? withCrew(crew, () => bioState(b, state.date)) : null;   // this crew's readings
  const st = cs ? cs.status : 'nodata';
  const info = s.info;
  const record = has
    ? `<div class="rec-sub"><span class="badge ${st}">${SEV_LABEL[st]}</span><span class="hint">Latest ${esc(fmtU(cs.v, b))}${cs.r ? ` · ${dayLabel(cs.r.date)} ${cs.r.time} UTC` : ''}</span></div>${zoneChart(b, withCrew(crew, () => recordPoints(b)))}`
    : `<div class="empty rec-empty">No ${esc(nice(b))} records for Crew ${crew} yet.</div>`;
  return `${topbar('doctor', 'instr')}<main class="page">
    <a class="back" data-back href="#/doctor/instructions" aria-label="Back" title="Back">←</a>
    <div class="title-row"><h1 class="page-title" style="margin:0">${esc(s.name)}</h1><button class="edit-btn" type="button" data-modal="edit" data-bio="${esc(b)}" aria-label="Edit instructions" title="Edit instructions">${ICON.pencil}</button></div>
    <div style="height:20px"></div>
    ${summaryCard(s)}
    <div class="detail-row">
      <section class="card crew-record">
        <div class="card-head"><button class="arrow" data-rec="-1" aria-label="Previous crew">‹</button><h3 class="rec-title"><img class="avatar" src="${IMG[crew]}" alt="" style="width:28px;height:28px">Crew ${crew} record</h3><button class="arrow" data-rec="1" aria-label="Next crew">›</button></div>
        ${record}
        <div class="pager-dots">${CREWS.map((c) => `<i class="${c === crew ? 'on' : ''}"></i>`).join('')}</div>
      </section>
      <section class="split-instr">
        <div class="si potential"><div class="k">IF POTENTIAL</div><p>${esc(info.yellow_instruction || 'No specific instruction.')}</p></div>
        <div class="si urgent"><div class="k">IF URGENT — DO THIS NOW</div><p>${esc(info.red_instruction || 'No specific instruction.')}</p></div>
      </section>
    </div>
    ${measureRow(s, b)}
  </main>`;
}
function chatPage(role) {
  const crewSide = role === 'crew';
  const shared = chat().filter((m) => m.attach);
  const left = crewSide
    ? `<section class="card side-card" style="align-self:start">
        <span class="label-pill">1:1 conversation</span>
        <div class="item" style="margin-bottom:18px"><div style="margin-bottom:8px"><b style="font-size:13px">Ground doctor</b></div><div class="hint">Your flight care team</div><div style="font-size:11.5px;margin-top:4px">${shared.length ? 'Sleep record received' : 'No records shared yet'}</div></div>
        <b style="font-size:13px">Shared in this chat</b>
        ${shared.slice(-1).map((m) => `<div class="item" style="margin:12px 0 14px"><div style="font-size:13px;margin-bottom:6px">${esc(m.attach.split(' · ')[0].replace(/^./, (c) => c.toUpperCase()))}</div><div class="hint">${esc(m.attach.split(' · ')[1] || '')} · 07:00</div><div class="hint">${(() => { const t = valueAt('Total Sleep Time', m.date); return t ? `${fmt(t.v, 'Total Sleep Time')} hours · ${SEV_LABEL[statusOf('Total Sleep Time', t.v)]}` : ''; })()}</div></div>`).join('') || '<p class="hint" style="margin:10px 0">Nothing shared yet.</p>'}
        <a class="btn primary block" href="#/crew/day/${shared.length ? shared[shared.length - 1].date : state.date}">${ICON.open}View shared record</a>
        <p class="hint" style="margin-top:12px">Your messages stay saved here while the connection is delayed.</p></section>`
    : `<section class="card side-card" style="align-self:start"><h3 class="ico-title" style="font-size:17px">${ICON.chat.replace('<svg', '<svg style="width:16px;height:16px;color:var(--electric)"')}Conversations</h3><p class="hint" style="margin:2px 0 14px">4 assigned astronauts</p>
        <div class="items">${CREWS.map((c) => { const msgs = chat(c), last = msgs[msgs.length - 1]; return `<button type="button" class="item convo ${c === DB.cur ? 'on' : ''}" data-crew="${c}" aria-pressed="${c === DB.cur}"><div style="font-size:13px">Crew ${c}</div><div class="hint" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last ? esc(last.text) : 'No messages yet'}</div><div style="font-size:11px;margin-top:4px">${last ? `${last.time} UTC · Latest message` : 'Open 1:1 conversation'}</div></button>`; }).join('')}</div>
        <p class="hint" style="margin-top:14px">Select a crew to open the conversation.</p></section>`;
  return `${topbar(role, 'home')}<main class="page">
    <a class="back" data-back href="${crewSide ? '#/crew' : '#/doctor'}" aria-label="Back" title="Back">←</a>
    <h1 class="page-title" style="margin-bottom:24px">${crewSide ? 'A conversation with your doctor.' : `A conversation with Crew ${DB.cur}.`}</h1>
    <div class="grid g-side">${left}${chatCard(role, false)}</div>
  </main>`;
}
function profilePage(role) {
  const crewSide = role === 'crew';
  const ns = notes();
  return `${topbar(role, '')}<main class="page">
    <h1 class="page-title">My profile</h1>${crewSide ? '<div style="height:16px"></div>' : '<p class="page-sub">Manage your personal information and care-team records.</p>'}
    <div class="grid g-profile">
      <section class="card" style="align-self:start">
        ${crewSide ? `<div style="display:flex;gap:12px;align-items:center;margin-bottom:18px"><img class="avatar" src="${IMG[DB.cur]}" alt="Crew ${DB.cur} profile photo" style="width:36px;height:36px"><h3>Crew ${DB.cur}</h3></div><b style="font-size:13px">My health information</b><p class="hint" style="margin-top:12px">Medical history: Not added</p><p class="hint" style="margin-top:10px">Allergies: Not added</p><p class="hint" style="margin-top:10px">Medication: Not added</p>`
          : `<h3 style="margin-bottom:16px">Ground doctor</h3><b style="font-size:13px">Professional information</b><p class="hint" style="margin-top:12px">Specialty: Not added</p><p class="hint" style="margin-top:10px">Organization: Not added</p><p class="hint" style="margin-top:10px">Assigned crew: A, B, C, D</p>`}
        <button class="btn primary block" style="margin:20px 0">${ICON.user}Update my details</button>
        <b style="font-size:13px">Doctor's notes</b>
        <p class="hint" style="margin:8px 0 14px">${ns.length ? `${ns.length} assessment${ns.length > 1 ? 's' : ''} saved — latest: ${esc(ns[ns.length - 1].title)}` : "Your doctor's assessments will appear here when a record is added."}</p>
        <a class="btn primary block" href="${crewSide ? '#/crew' : '#/doctor'}/instructions">${ICON.doc}Open Health Instruction</a>
      </section>
      <div class="stack">
        <section class="card"><h3 class="ico-title">${ICON.user}Personal information</h3><p class="hint" style="margin:6px 0 20px">${crewSide ? 'Your profile details for this mission.' : 'Your care-team profile for this mission.'}</p>
          <dl class="kv"><dt>Name</dt><dd>${crewSide ? `Crew ${DB.cur}` : 'Not added'}</dd><dt>Email</dt><dd>Not added</dd><dt>Mission start date</dt><dd>October 1, 2026</dd><dt>${crewSide ? 'Mission time' : 'Mission reference'}</dt><dd>${crewSide ? dayLabel(state.date) : 'SOL ' + pad3(missionDay(state.date))}</dd></dl></section>
        <section class="card"><h3 class="ico-title" style="margin-bottom:18px">${ICON.doc}${crewSide ? 'My records' : 'Care records'}</h3>
          <a class="rec-link" href="${crewSide ? '#/crew/attention' : '#/doctor/crew/A'}"><b>${crewSide ? 'Health history' : 'Crew health history'} ›</b><small>Medical history, allergies and medication</small></a>
          <a class="rec-link" href="${crewSide ? '#/crew' : '#/doctor'}/instructions"><b>${crewSide ? "Doctor's notes" : 'My consultation notes'} ›</b><small>Your saved assessments and consultations</small></a>
          <a class="rec-link" href="${crewSide ? '#/crew' : '#/doctor'}/instructions" style="margin:0"><b>Saved instructions ›</b><small>Care guidance you can return to</small></a></section>
      </div>
    </div>
  </main>`;
}

/* ================= DOCTOR (EARTH) ================= */
/** Per biomarker across all crews: worst state, crews flagged Urgent/Potential, and any measured crew. */
function crewMatrix() {
  const by = {};
  CREWS.forEach((c) => statesFor(c).forEach((x) => { (by[x.b] = by[x.b] || []).push({ c, s: x }); }));
  return (b) => {
    const rows = (by[b] || []).filter((r) => r.s.status !== 'nodata');
    const worst = rows.reduce((m, r) => (SEV[r.s.status] > SEV[m] ? r.s.status : m), 'nodata');
    const flagged = rows.filter((r) => r.s.status === 'urgent' || r.s.status === 'potential').sort((a, z) => SEV[z.s.status] - SEV[a.s.status]);
    const top = flagged[0] || rows[0];
    return { worst, flagged, rows, top };
  };
}
const crewChips = (list) => `<div class="crew-chips">${list.map((r) => `<span class="crew-chip" title="Crew ${r.c} · ${esc(fmtU(r.s.v, r.s.b))} · ${SEV_LABEL[r.s.status]}"><img src="${IMG[r.c]}" alt="">Crew ${r.c}</span>`).join('')}</div>`;

function libraryItems() {
  const m = crewMatrix();
  const base = Object.values(DB.info).map((i) => {
    const x = m(i.biomarker);
    const flagged = x.flagged.length > 0;
    return { b: i.biomarker, category: i.category, status: x.worst, flagged: x.flagged, forCrew: flagged, text: flagged ? withCrew(x.flagged[0].c, () => instructionFor(x.flagged[0].s)) : i.summary };
  });
  const mine = libExtra().map((x) => ({ b: x.title, category: '', status: 'mine', flagged: [], forCrew: false, mine: true, text: x.text }));
  return [...mine, ...base].sort((a, z) => (SEV[z.status] || 0) - (SEV[a.status] || 0) || a.b.localeCompare(z.b));
}
function libraryList(limit) {
  const f = state.libFilter, q = state.libQuery.toLowerCase();
  const items = libraryItems().filter((i) => (f === 'all' || (f === 'potential' && i.status === 'potential') || (f === 'urgent' && i.status === 'urgent')) && (!q || (i.b + i.category + i.text).toLowerCase().includes(q)));
  const chips = [['all', 'All'], ['potential', 'Potential'], ['urgent', 'Urgent']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-lf="${k}">${l}</button>`).join('');
  return `<form class="search" data-search="libQuery"><label class="field" style="background:#fff">${ICON.search}<input name="q" value="${esc(state.libQuery)}" placeholder="Search a biomarker, category or protocol…"></label></form>
    <div class="chips" style="margin-bottom:14px">${chips}</div>
    <div class="items lib" style="max-height:${limit ? '560px' : 'none'};overflow-y:auto">${items.map((i) => `<a class="item ${i.forCrew ? 'care ' + i.status : ''}" href="${i.mine ? '#/doctor/instructions' : '#/doctor/bio/' + enc(i.b)}">
      ${i.forCrew ? crewChips(i.flagged) : ''}
      <div class="ttl">${esc(nice(i.b))}<span>${esc(i.category)}</span></div><div class="desc">${esc(i.text)}</div></a>`).join('') || '<div class="empty">Nothing matches.</div>'}</div>`;
}
/** Doctor › Health Instruction: the full instruction library, two columns, no status tags. */
function doctorLibraryPage() {
  const q = state.libQuery.toLowerCase();
  const f = state.libAtt || 'all';
  const m = crewMatrix();                                   // every crew, worst state per biomarker
  const mine = libExtra().map((x) => ({ b: x.title, category: 'Added instruction', method: '', summary: x.text, mine: true, status: 'nodata', x: { flagged: [], rows: [] } }));
  const lib = [...mine, ...Object.values(DB.info).map((i) => { const x = m(i.biomarker); return { b: i.biomarker, category: i.category, method: i.method, summary: i.summary, yi: i.yellow_instruction, ri: i.red_instruction, status: x.worst, x }; })]
    .filter((i) => !q || (i.b + i.category + i.summary + (i.yi || '') + (i.ri || '')).toLowerCase().includes(q));
  const cnt = (k) => lib.filter((i) => i.status === k).length;
  const chip = (k, l) => `<button class="chip ${f === k ? 'on' : ''}" data-la="${k}">${k !== 'all' ? `<i class="dot ${k}"></i>` : ''}${l}<span class="n">${k === 'all' ? lib.length : cnt(k)}</span></button>`;
  const HEAD = { urgent: 'URGENT', potential: 'POTENTIAL', normal: 'NORMAL', nodata: 'NOT MEASURED' };
  const card = (i) => {
    const tag = i.mine ? 'article' : `a href="#/doctor/bio/${enc(i.b)}"`;
    const crewTag = i.x.flagged.length ? crewChips(i.x.flagged) : '';
    const val = '';
    return `<${tag} class="alert lib-row">
      <div class="top"><div class="nm">${crewTag}<h4>${esc(nice(i.b))}</h4><small>${esc(i.category)}${i.method ? ' · ' + esc(i.method) : ''}</small></div>${val}${i.mine ? '' : '<span class="chev">›</span>'}</div>
      <div class="body st-${i.status}"><div class="k">SUMMARY</div><p>${esc(i.summary)}</p>
        ${i.yi || i.ri ? `<div class="lib-ins-row">${i.yi ? `<div class="lib-ins potential"><b>If Potential</b>${esc(i.yi)}</div>` : ''}${i.ri ? `<div class="lib-ins urgent"><b>If Urgent</b>${esc(i.ri)}</div>` : ''}</div>` : ''}</div>
    </${i.mine ? 'article' : 'a'}>`;
  };
  const sections = ['urgent', 'potential', 'normal', 'nodata'].filter((k) => f === 'all' || f === k).map((k) => {
    const items = lib.filter((i) => i.status === k);
    if (!items.length) return '';
    if (k === 'normal') return `<div class="sev-h normal">${HEAD[k]} · ${items.length}</div><div class="normal-grid">${items.map((i) => `<a class="nrow" href="#/doctor/bio/${enc(i.b)}"><div class="nm"><b>${esc(nice(i.b))}</b><small>${esc(i.category)} · ${esc(i.method)}</small></div><div class="v">All crews<small>${i.x.rows.length} measured · Normal</small></div><span class="chev">›</span></a>`).join('')}</div>`;
    return `<div class="sev-h ${k}">${HEAD[k]} · ${items.length}</div>${items.map(card).join('')}`;
  }).join('');
  return `${topbar('doctor', 'instr')}<main class="page dark">
    <div class="title-row"><h1 class="page-title" style="margin:0">Health Instruction</h1><button class="edit-btn" type="button" data-modal="library" aria-label="Add instruction" title="Add instruction">${ICON.pencil}</button></div>
    <p class="page-sub" style="margin-top:8px">The full instruction library, matched to every crew's latest readings — most urgent first.</p>
    ${searchBar('libQuery', 'Search a biomarker, category or protocol…', true)}
    <div class="chips">${chip('all', 'All')}${chip('urgent', 'Urgent')}${chip('potential', 'Potential')}${chip('normal', 'Normal')}</div>
    ${sections || '<div class="empty">Nothing matches your search.</div>'}
  </main>`;
}
/** Biomarker carousel (#1 large chart, #2-#3 small), shared by the doctor Overview and the astronaut hazard board.
 *  key = state field holding the page index; ranked = severity-sorted measured biomarkers. */
function biomarkerCarousel({ ranked, bioBase, title, emptyText }) {
  const p14 = (s) => s.pts.slice(-14);
  const crit = (s) => (DB.rules[s.b] && DB.rules[s.b].yellowRaw ? `Normal: ${DB.rules[s.b].yellowRaw}` : s.category);
  const [big, ...rest] = ranked;
  const bigCard = big ? `<a class="bio-big" href="${bioBase}/${enc(big.b)}"><div style="display:flex;justify-content:space-between;gap:10px"><div><h4><span class="rk">#1</span>${esc(big.name)}</h4><small class="hint">${esc(big.category)}</small></div><div><div class="num ${big.status}">${esc(fmt(big.v, big.b))}</div><div style="text-align:right;margin-top:6px"><span class="badge ${big.status}">${SEV_LABEL[big.status]}</span></div></div></div>
      <div style="margin:12px 0 8px">${areaChart(big.b, p14(big), { w: 400, h: 230 })}</div>
      <div style="display:flex;justify-content:space-between;gap:10px;font-size:10.5px"><span class="hint" style="font-size:10.5px">${esc(crit(big))} · ${p14(big).filter((p) => statusOf(big.b, p.v) !== 'normal').length} of ${p14(big).length} readings flagged in 14 days</span><span style="color:var(--electric);white-space:nowrap">Open records ›</span></div></a>` : '';
  const small = rest.map((s, i) => `<a class="bio-small" href="${bioBase}/${enc(s.b)}"><div style="display:flex;justify-content:space-between;gap:6px"><h4><span class="rk">#${i + 2}</span>${esc(s.name)}</h4><span class="num ${s.status}">${esc(fmtU(s.v, s.b))}</span></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><small class="hint" style="font-size:10px">${esc(s.category)}</small><span class="badge ${s.status}">${SEV_LABEL[s.status]}</span></div>${areaChart(s.b, p14(s), { w: 220, h: 110, axis: false })}</a>`).join('');
  return `<div class="card-head"><h3>${title}</h3><span class="hint">${ranked.length} biomarkers · scroll →</span></div>
    <div class="bio-strip">${ranked.length ? bigCard + small : `<div class="bio-big bio-empty">${emptyText}</div>`}</div>`;
}
function doctorHome() {
  const all = Object.fromEntries(CREWS.map((c) => [c, statesFor(c)]));
  const flagged = CREWS.flatMap((c) => all[c].filter((s) => s.status === 'urgent' || s.status === 'potential'));
  const sel = state.docCrew;
  const states = all[sel];
  // Biomarkers ordered Urgent > Potential > Normal (allStates is severity-sorted).
  const ranked = states.filter((s) => s.status !== 'nodata');
  const tile = (c) => {
    const st = hasCrew(c) ? all[c] : null;
    return `<div class="crew-tile ${c === sel ? 'on' : ''}"><button type="button" class="tile-sel" data-crew="${c}" aria-pressed="${c === sel}">${miniDonut(st, c)}<b>Crew ${c}</b></button><a class="tile-open" href="#/doctor/crew/${c}">View page ›</a></div>`;
  };
  return `${topbar('doctor', 'home')}<main class="page">
    <section class="hero-doc">
      <span class="chip-day"><i>${ICON.planet}</i>${dayLabel(state.date)} · EARTH</span>
      <h1 class="hero-title">Welcome back, <b>Doctor</b></h1>
      <p class="hero-sub">${weekday(state.date)}, ${shortDate(state.date)}<span class="bar">|</span>4 astronauts in your care ·${flagged.length} reading${flagged.length === 1 ? '' : 's'} to review today</p>
    </section>
    <div class="grid g-doc">
      <section class="card soft"><div class="card-head"><h3>Health Instruction</h3><a class="chev" href="#/doctor/instructions" aria-label="Open">›</a></div>
        ${libraryList(true)}
        <button class="btn navy block doc-add" data-modal="library">+ &nbsp;Add instruction</button></section>
      <section class="card">
        <div class="card-head"><h3>Crew hazard board</h3><div class="legend"><span><i class="dot sky"></i>Normal</span><span><i class="dot potential"></i>Potential</span><span><i class="dot urgent"></i>Urgent</span></div></div>
        <div class="crew-tiles">${CREWS.map(tile).join('')}</div>
        ${biomarkerCarousel({ ranked, bioBase: '#/doctor/bio', title: `Biomarkers · Crew ${sel}`, emptyText: `No biomarker data for Crew ${sel} yet.` })}
        <form class="compose doc-compose" data-chat="doctor" data-crew="${sel}"><input name="m" placeholder="Write a message to Crew ${sel}…" autocomplete="off"><button class="btn primary" type="submit">Send ${ICON.send}</button></form>
      </section>
    </div>
  </main>`;
}
function doctorCrew(c) {
  const hasData = hasCrew(c);
  const states = statesFor(c);
  const TILE = [['Total Sleep Time', 'Time asleep'], ['Sleep Efficiency', 'Sleep efficiency'], ['Self-reported sleep quality', 'slept'], ['Mood', 'Mood'], ['Team cohesion', 'Team cohesion'], ['LDL-cholesterol', 'Cholesterol']];
  const tiles = TILE.map(([b, l]) => { const s = states.find((x) => x.b === b); return s ? `<a class="tile" href="#/doctor/bio/${enc(b)}"><small>${l}</small><div class="num ${s.status}">${esc(fmt(s.v, b))}${unitOf(b) && unitOf(b).length < 4 ? `<small>${esc(unitOf(b))}</small>` : ''}</div><div class="st ${s.status}">${SEV_LABEL[s.status]}</div>${areaChart(b, s.pts.slice(-10), { w: 160, h: 34, axis: false })}</a>` : ''; }).join('');
  const shown = states.filter((s) => s.status !== 'nodata');
  const cats = ['All', ...new Set(shown.map((s) => s.category))];
  const grid = shown.filter((s) => state.bioCat === 'All' || s.category === state.bioCat);
  const head = `<img class="avatar" src="${IMG[c]}" alt="Crew ${c} profile photo" style="width:96px;height:96px">`;
  return `${topbar('doctor', 'home')}<main class="page">
    <a class="back" data-back href="#/doctor" aria-label="Back" title="Back">←</a>
    <div class="crew-head">${head}<div><div class="lbl">ASTRONAUT · MARS MISSION</div><h1>Crew ${c}</h1><small>${dayLabel(state.date)} &nbsp; Mission start Oct 1</small></div>
      <div class="right">
        <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn outline" href="${hasData ? `#/doctor/day/${c}/${state.date}` : '#/doctor/crew/' + c}">Daily records</a><button class="btn outline" data-modal="instruction">Send instruction</button><a class="btn primary" href="#/doctor/chat">${ICON.chat}Message</a></div></div></div>
    <section class="card" style="padding:20px">${weekCalendar(c, (x) => (hasData ? `#/doctor/day/${c}/${x}` : `#/doctor/crew/${c}`))}</section>
    ${hasData ? `<div class="tiles">${tiles}</div>
    <section class="card"><h3 style="margin-bottom:12px">Biomarkers</h3>
      <div class="chips" style="margin-bottom:16px">${cats.map((k) => `<button class="chip ${state.bioCat === k ? 'on' : ''}" data-cat="${esc(k)}">${esc(k)}</button>`).join('')}</div>
      <div class="bio-grid">${grid.map((s, i) => `<a class="bio-card ${s.status}" href="#/doctor/bio/${enc(s.b)}"><div class="h"><div><small>#${i + 1}</small> <b>${esc(s.name)}</b></div><span class="num ${s.status}">${esc(fmt(s.v, s.b))}</span></div><div class="h" style="align-items:center"><small>${esc(s.category)}</small><span class="badge ${s.status}">${SEV_LABEL[s.status]}</span></div><div style="margin-top:6px">${areaChart(s.b, s.pts.slice(-14), { w: 220, h: 46, axis: false })}</div><div class="f">${s.pts.slice(-14).filter((p) => statusOf(s.b, p.v) !== 'normal').length} of ${s.pts.slice(-14).length} readings flagged</div></a>`).join('')}</div>
    </section>` : `<section class="card" style="margin-top:18px"><div class="empty">No biomarker data for Crew ${c} yet.</div></section>`}
  </main>`;
}

/* ---------------- onboarding: which crew member are you? ---------------- */
function crewSelect() {
  const sel = state.pick || state.me;
  return `<main class="landing onboard"><div class="inner wide">
    <img class="logo" src="${IMG.logo}" alt="KOOK — Kinetic Observation &amp; Optimal Keel">
    <div class="ob-title"><a class="btn ob-back" href="#/">← Back</a><h1>Who's checking in?</h1><button type="button" class="btn yellow-cta" data-me="${sel}">Continue as Crew ${sel} →</button></div>
    <div class="crew-choose">${CREWS.map((c) => `<button type="button" class="crew-choice ${c === sel ? 'on' : ''}" data-pick="${c}" aria-pressed="${c === sel}">
      <img src="${IMG[c]}" alt=""><b>Crew ${c}</b></button>`).join('')}</div>
    <section class="baseline">
      <div class="bl-left">
        <div class="bl-kicker">${ICON.globe}EARTH BASELINE</div>
        <h2>Bring your health data from Earth.</h2>
        <p>To support your care throughout the mission, we collect your health data on Earth as your baseline. The same biomarkers are measured again in space and compared with it, so your care team can see what has changed for you.</p>
        <div class="bl-chips"><span><b>77</b> biomarkers</span><span>${ICON.tube}Samples</span><span>${ICON.monitor}Cognitive tests</span><span>${ICON.device}Device Outputs</span></div>
      </div>
      <div class="bl-right">
        <div class="bl-step"><i>1</i><p>Download the template to see which biomarkers to prepare and how to measure each one.</p></div>
        <a class="bl-btn light" href="${ROOT}/ui/baseline_template.csv" download="baseline_template.csv">${ICON.download}Download baseline template (.csv)</a>
        <div class="bl-step"><i>2</i><p>Fill in your Earth results and upload the file.</p></div>
        <button type="button" class="bl-btn primary" data-upload-done>${ICON.upload}Upload baseline records (.csv)</button>
      </div>
    </section>
  </div></main>`;
}

/* ---------------- landing (Figma onboarding(1)) ---------------- */
function landing() {
  return `<main class="landing"><div class="inner">
    <img class="logo" src="${IMG.logo}" alt="KOOK — Kinetic Observation &amp; Optimal Keel">
    <h1>One mission. Connected care.</h1>
    <div class="roles">
      <a class="role-card space" href="#/select"><span class="ws">SPACE WORKSPACE</span><span class="orb"></span><h2>I'm an astronaut</h2><p>View your schedule, health instructions and conversations with your ground doctor.</p></a>
      <a class="role-card earth" href="#/doctor"><span class="ws">EARTH WORKSPACE</span><span class="orb"></span><h2>I'm a doctor</h2><p>Review crew schedules, health instructions and conversations with astronauts.</p></a>
    </div>
  </div></main>`;
}

/* ---------------- modals ---------------- */
function openModal(kind, bio) {
  const opts = DB.bios.map((b) => `<option value="${esc(b)}" ${b === bio ? 'selected' : ''}>${esc(nice(b))}</option>`).join('');
  if (kind === 'edit') {
    const i = DB.info[bio] || {};
    $('#modal-root').innerHTML = `<div class="modal-bg"><form class="modal" data-form="edit" data-bio="${esc(bio)}"><h3>Edit ${esc(nice(bio))}</h3>
      <label>Summary</label><textarea name="summary">${esc(i.summary || '')}</textarea>
      <label>If Potential</label><textarea name="yi">${esc(i.yellow_instruction || '')}</textarea>
      <label>If Urgent</label><textarea name="ri">${esc(i.red_instruction || '')}</textarea>
      <div class="actions"><button type="button" class="btn cancel" data-close>Cancel</button><button class="btn primary">Save</button></div></form></div>`;
    $('#modal-root textarea').focus();
    return;
  }
  $('#modal-root').innerHTML = kind === 'instruction'
    ? `<div class="modal-bg"><form class="modal" data-form="instruction"><h3>Send instruction to Crew ${state.docCrew}</h3>
        <label>Related biomarker</label><select name="bio"><option value="">General</option>${opts}</select>
        <label>Title</label><input name="title" required placeholder="e.g. Reduce sugar intake today">
        <label>Instruction</label><textarea name="text" required placeholder="What should Crew ${state.docCrew} do?"></textarea>
        <div class="actions"><button type="button" class="btn cancel" data-close>Cancel</button><button class="btn primary">Send to crew</button></div></form></div>`
    : `<div class="modal-bg"><form class="modal" data-form="library"><h3>Add instruction</h3>
        <label>Biomarker or protocol</label><input name="title" required placeholder="e.g. Post-EVA hydration protocol">
        <label>Instruction text</label><textarea name="text" required></textarea>
        <div class="actions"><button type="button" class="btn cancel" data-close>Cancel</button><button class="btn primary">Add</button></div></form></div>`;
  const first = $('#modal-root input, #modal-root select'); if (first) first.focus();
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };
let toastTimer;
function toast(msg) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ---------------- render + events ---------------- */
function render() {
  const { parts, qs } = route();
  const [role, sub, a1, a2] = parts;
  let html, r = null;
  if (role === 'crew') {
    r = 'crew';
    if (sub === 'day') setDate(a1 || state.date);
    html = withCrew(state.me, () => {
      if (sub === 'day') return dayPage('crew', state.date, state.me);
      if (sub === 'instructions' || sub === 'attention') return attentionPage('crew');
      if (sub === 'bio') return bioPage('crew', a1);
      if (sub === 'chat') return chatPage('crew');
      if (sub === 'profile') return profilePage('crew');
      return crewHome();
    });
  } else if (role === 'select') {
    html = crewSelect();
  } else if (role === 'doctor') {
    r = 'doctor';
    if (sub === 'crew') { const c = CREWS.includes(a1) ? a1 : 'A'; state.docCrew = c; html = doctorCrew(c); }
    else if (sub === 'day') { setDate(a2 || state.date); const c = CREWS.includes(a1) ? a1 : 'A'; html = withCrew(c, () => dayPage('doctor', state.date, c)); }
    else if (sub === 'instructions') html = doctorLibraryPage();
    else if (sub === 'attention') html = withCrew(state.docCrew, () => attentionPage('doctor'));
    else if (sub === 'bio') { if (state.recBio !== a1) { state.recBio = a1; state.recCrew = 0; } html = bioPage('doctor', a1); }
    else if (sub === 'chat') html = withCrew(state.docCrew, () => chatPage('doctor'));
    else if (sub === 'profile') html = profilePage('doctor');
    else html = doctorHome();
  } else html = landing();
  $('#app').innerHTML = html;
  if (r) fab(r); else $('#fab-root').innerHTML = '';
  const log = $('#chatlog'); if (log) log.scrollTop = log.scrollHeight;
  // Full name on hover for any title that had to be shortened with an ellipsis.
  document.querySelectorAll('.bio-big h4, .bio-small h4, .bio-card .h > div:first-child, .tile small, .nrow .nm b, .row .nm b, .alert h4').forEach((el) => { el.title = el.textContent.trim(); });
  const att = qs.get('attach');
  if (att && sub === 'chat') { const inp = $('.compose input'); if (inp) { inp.value = 'Could you check this record?'; inp.dataset.attach = att; inp.focus(); } }
  document.title = r === 'crew' ? `KOOK · Crew ${state.me}` : r === 'doctor' ? 'KOOK · Ground Doctor' : 'KOOK Dashboard';
}
const rerender = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
function refocus(key) { const inp = document.querySelector(`form[data-search="${key}"] input`); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } }

document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-close]'); if (!t) return;
  const d = t.dataset;
  if (d.cal) { state.calStart = addDays(state.calStart, +d.cal); rerender(); }
  else if (d.hz) { state.hazardFilter = d.hz; rerender(); }
  else if (d.if) { state.instrFilter = d.if; rerender(); }
  else if (d.af) { state.attFilter = d.af; rerender(); }
  else if (d.lf) { state.libFilter = d.lf; rerender(); }
  else if (d.la) { state.libAtt = d.la; rerender(); }
  else if (d.cat) { state.bioCat = d.cat; rerender(); }
  else if (d.rec) { state.recCrew = (state.recCrew || 0) + +d.rec; rerender(); }
  else if (d.car) { const k = d.carKey || 'carousel'; state[k] = (state[k] || 0) + +d.car; rerender(); }
  else if (d.attachNote !== undefined) toast('File attachments are not available yet. They will be added in a later version.');
  else if (d.pick) { state.pick = d.pick; rerender(); }
  else if (d.uploadDone !== undefined) toast(`Crew ${state.pick || state.me}'s Earth baseline records were already submitted. You can't upload them again.`);
  else if (d.me) { state.me = d.me; store.set('me', d.me); state.crewCarousel = 0; location.hash = '#/crew'; }
  else if (d.crew) { state.docCrew = d.crew; state.carousel = 0; rerender(); }
  else if (d.modal) openModal(d.modal, d.bio);
  else if (d.close !== undefined) closeModal();
});
$('#modal-root').addEventListener('click', (e) => { if (e.target.classList.contains('modal-bg')) closeModal(); });
document.addEventListener('submit', (e) => {
  const f = e.target; e.preventDefault();
  if (f.dataset.chat) {
    const inp = f.querySelector('input'); sendChat(f.dataset.chat, inp.value, inp.dataset.attach, f.dataset.crew || (f.dataset.chat === 'crew' ? state.me : state.docCrew));
    if (location.hash.includes('?')) location.hash = location.hash.split('?')[0]; else rerender();
  } else if (f.dataset.goto) {
    state.query = f.q.value; state.attFilter = 'all'; location.hash = f.dataset.goto;
  } else if (f.dataset.search) {
    state[f.dataset.search] = f.q.value; rerender(); refocus(f.dataset.search);
  } else if (f.dataset.form === 'instruction') {
    const c = state.docCrew, n = notes(c);
    n.push({ bio: f.bio.value, title: f.title.value.trim(), text: f.text.value.trim(), date: state.date, time: new Date().toISOString().slice(11, 16) });
    store.set('notes' + c, n);
    sendChat('doctor', `New instruction: ${f.title.value.trim()} — see Health Instruction › Doctor's notes.`, undefined, c);
    closeModal(); rerender();
  } else if (f.dataset.form === 'edit') {
    const b = f.dataset.bio, edits = store.get('edits', {});
    edits[b] = { summary: f.summary.value.trim(), yellow_instruction: f.yi.value.trim(), red_instruction: f.ri.value.trim() };
    store.set('edits', edits); applyEdits(); closeModal(); rerender(); toast('Instructions saved.');
  } else if (f.dataset.form === 'library') {
    const l = libExtra(); l.push({ title: f.title.value.trim(), text: f.text.value.trim() }); store.set('library', l); closeModal(); rerender();
  }
});
let deb;
document.addEventListener('input', (e) => {
  const f = e.target.closest('form[data-search]'); if (!f) return;
  clearTimeout(deb); deb = setTimeout(() => { state[f.dataset.search] = e.target.value; rerender(); refocus(f.dataset.search); }, 250);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
const tip = document.createElement('div'); tip.className = 'tip'; tip.style.display = 'none'; document.body.appendChild(tip);
document.addEventListener('mousemove', (e) => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (!t) { tip.style.display = 'none'; return; }
  tip.textContent = t.getAttribute('data-tip'); tip.style.display = 'block';
  tip.style.left = Math.min(e.clientX + 12, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = e.clientY + 14 + 'px';
});
// "←" back links: go to the previous in-app page; fall back to the link target when there is none.
const navStack = [location.hash.split('?')[0] || '#/'];
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-back]'); if (!a) return;
  if (navStack.length > 1) { e.preventDefault(); history.back(); }
});
window.addEventListener('hashchange', () => {
  const h = location.hash.split('?')[0] || '#/';
  if (navStack.length > 1 && navStack[navStack.length - 2] === h) navStack.pop();
  else if (navStack[navStack.length - 1] !== h) navStack.push(h);
  closeModal(); render(); window.scrollTo(0, 0);
});
window.addEventListener('storage', (e) => { if (e.key && e.key.startsWith('kook.')) rerender(); });
let lastSlot = Math.floor(simNow().getTime() / 300000);
setInterval(() => {
  document.querySelectorAll('.live-clock').forEach((c) => { c.textContent = `UTC ${simStamp()}`; });
  // A new 5-minute reading becomes "latest": refresh today's view unless the viewer is typing or in a dialog.
  const slot = Math.floor(simNow().getTime() / 300000);
  if (slot !== lastSlot) {
    lastSlot = slot;
    const busy = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (state.date === TODAY && !busy && !$('#modal-root').innerHTML && route().parts[0]) rerender();
  }
  // Day rollover (incl. Nov 30 → Nov 1 loop): move "today" and follow it if the viewer was on today.
  const now = simNow().toISOString().slice(0, 10);
  if (now !== TODAY) {
    const prev = TODAY; TODAY = now;
    if (state.date === prev) { setDate(TODAY); if (route().parts[1] !== 'day') rerender(); }
    document.querySelectorAll('.live-sol').forEach((x) => { x.textContent = `SOL ${pad3(missionDay(TODAY))}`; });
  }
}, 1000);

Promise.all(Object.entries(PATHS).map(([k, p]) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${decodeURIComponent(p)} → ${r.status}`); return r.text(); }).then((t) => [k, parseCSV(t)])))
  .then((pairs) => { buildModel(Object.fromEntries(pairs)); applyEdits(); render(); })
  .catch((err) => { $('#app').innerHTML = `<div class="loading">Could not load data: ${esc(err.message)}<br><small>Serve the repository root over HTTP and open /dashboard/.</small></div>`; console.error(err); });
})();
