// KOOK test bench: replays one crew's day and shows what each transmission lane carries.
//
//   RAW   every reading as CSV (what the crew measured)
//   HOT   Potential / Urgent readings, gathered every second, each file zstd-compressed
//   COLD  Normal readings summarised per biomarker, compressed with CCSDS 121, sent hourly
//
// The lane logic is the Rust/WebAssembly simulator in ./pkg (from minuncho/prep space-sim):
// rows go in one by one (Sim.playStep), it asks for files (nextRequest), we compress them and queue
// them (enqueue), and it releases them in order (dispatch). Its "priority" lane is our HOT lane.
// Status rules are the dashboard's: biomarker.csv yellow = normal range, red = urgent, otherwise potential.
// The simulator expects Normal / Warning / Critical, so potential → Warning and urgent → Critical.

const VERSION = new URL(import.meta.url).search;
const { default: init, Sim } = await import(`./pkg/space_sim.js${VERSION}`);

const ROOT = '..';
const TX_DELAY_MS = 20 * 60000;           // one-way light delay (same as the dashboard)
const LINK_BYTES_PER_SEC = 10 * 1024;
const COLD_EVERY_MS = 60 * 60000;
const PRIO_EVERY_MS = 1000;
const ZSTD_LEVEL = 19;
const ZSTD_PKG = 'https://cdn.jsdelivr.net/npm/@bokuweb/zstd-wasm@0.0.27';
const DEFAULT_DAY = '2026-11-13';
const MAX_RAW_ROWS = 300;

const $ = (id) => document.getElementById(id);
const utf8 = new TextEncoder();
const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '');

// ===== CSV + status rules (same as dashboard/app.js) =====
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}
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
const RULES = {};
function statusOf(b, v) {
  const r = RULES[b];
  if (!r || Number.isNaN(v)) return 'Normal';
  if (r.red && r.red.some((p) => test1(p, v))) return 'Critical';
  if (r.yellow) return r.yellow.some((p) => test1(p, v)) ? 'Normal' : 'Warning';
  return 'Normal';
}
const LABEL = { Normal: 'Normal', Warning: 'Potential', Critical: 'Urgent' };

parseCSV(await fetch(`${ROOT}/data/biomarker/biomarker.csv`).then((r) => r.text()))
  .forEach((r) => { RULES[r.biomarker] = { yellow: parseRule(r.yellow), red: parseRule(r.red) }; });

// ===== simulator + zstd =====
await init({ module_or_path: new URL(`./pkg/space_sim_bg.wasm${VERSION}`, import.meta.url) });
const sim = new Sim(true, 0, 0, TX_DELAY_MS, LINK_BYTES_PER_SEC, COLD_EVERY_MS, PRIO_EVERY_MS, Date.now());
let zstd = null;
import(`${ZSTD_PKG}/+esm`).then(async (m) => { await m.init(`${ZSTD_PKG}/dist/esm/zstd.wasm`); zstd = m; }).catch((e) => console.error('zstd failed to load', e));

// ===== state =====
let slots = [], slotIdx = 0, timer = null, total = 0;
const played = { n: 0, bytes: 0, hotRaw: 0, coldRaw: 0 };
const SENT = { hot: { n: 0, bytes: 0 }, cold: { n: 0, bytes: 0 } };
const pending = new Map();
const rowBytes = (r) => utf8.encode(`${r.ts},${r.b},${r.fig},${r.st}\n`).length;

async function loadDay() {
  stop();
  const crew = $('crewSel').value, day = $('daySel').value;
  const rows = parseCSV(await fetch(`${ROOT}/data/crew/${crew}_hotdata.csv`).then((r) => r.text()))
    .filter((r) => r.date === day)
    .map((r) => ({ ts: `${r.date} ${r.time}`, b: r.biomarker, fig: r.figure, st: statusOf(r.biomarker, parseFloat(r.figure)) }))
    .sort((a, z) => a.ts.localeCompare(z.ts));
  sim.load('timestamp,Biomarker,Figure,Status\n' + rows.map((r) => `${r.ts},${r.b},${r.fig},${r.st}`).join('\n') + '\n');
  slots = [];
  rows.forEach((r) => { if (!slots.length || slots[slots.length - 1][0].ts !== r.ts) slots.push([]); slots[slots.length - 1].push(r); });
  total = rows.length;
  reset();
  $('btnStart').disabled = false; $('btnReset').disabled = false;
}
function reset() {
  stop();
  sim.reset();
  slotIdx = 0;
  Object.assign(played, { n: 0, bytes: 0, hotRaw: 0, coldRaw: 0 });
  Object.values(SENT).forEach((x) => { x.n = 0; x.bytes = 0; });
  pending.clear();
  $('rawList').innerHTML = '<div class="empty">Press Start to replay the day.</div>';
  render();
}

// ===== playback: one 5-minute slot per tick =====
function step() {
  if (slotIdx >= slots.length) { stop(); $('btnStart').disabled = true; return; }
  const box = $('rawList');
  const empty = box.querySelector('.empty'); if (empty) empty.remove();
  const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  slots[slotIdx++].forEach((r) => {
    sim.playStep();
    played.n++; const n = rowBytes(r); played.bytes += n;
    if (r.st === 'Normal') played.coldRaw += n; else played.hotRaw += n;
    const el = document.createElement('div');
    el.className = 'r';
    el.innerHTML = `<span class="t"></span><span class="b"></span><span class="v ${r.st}"></span>`;
    el.children[0].textContent = r.ts.slice(11); el.children[1].textContent = r.b; el.children[2].textContent = r.fig;
    el.title = LABEL[r.st];
    box.appendChild(el);
  });
  while (box.children.length > MAX_RAW_ROWS) box.firstElementChild.remove();
  if (stick) box.scrollTop = box.scrollHeight;
}
function start() {
  if (slotIdx >= slots.length) return;
  sim.setPlaying(true);
  timer = setInterval(step, +$('speedSel').value);
  $('btnStart').textContent = 'Pause';
  step();
}
function stop() { clearInterval(timer); timer = null; $('btnStart').textContent = 'Start'; }

// ===== lanes: compress what the simulator asks for, count what it sends =====
function pump(now) {
  if (zstd) {
    for (;;) {
      const s = sim.nextRequest(now); if (!s) break;
      const req = JSON.parse(s);
      const bytes = req.encoding === 'ccsds121' ? new Uint8Array(req.bytes) : zstd.compress(utf8.encode(req.text), ZSTD_LEVEL);
      pending.set(sim.enqueue(req.kind, req.name, bytes.length), bytes);
    }
  }
  for (;;) {
    const s = sim.dispatch(now); if (!s) break;
    const d = JSON.parse(s);
    const bytes = pending.get(d.blockId); pending.delete(d.blockId);
    const k = /priority/i.test(d.name) ? 'hot' : /cold/i.test(d.name) ? 'cold' : null;
    if (k && bytes) { SENT[k].n++; SENT[k].bytes += bytes.length; }
  }
}

// ===== render =====
function rows(id, list, make, emptyText) {
  const box = $(id);
  if (!list.length) { box.innerHTML = `<div class="empty">${emptyText}</div>`; return; }
  box.replaceChildren(...list.map((x) => { const el = document.createElement('div'); el.className = 'r'; make(el, x); return el; }));
}
function cell(el, text, cls) { const s = document.createElement('span'); s.textContent = text; if (cls) s.className = cls; el.appendChild(s); }
function render() {
  const snap = JSON.parse(sim.snapshot(Date.now()));
  const cur = slots[Math.max(0, slotIdx - 1)];
  $('now').firstChild.textContent = slotIdx && cur ? cur[0].ts.slice(11) : '--:--';
  $('nowSub').textContent = `Crew ${$('crewSel').value} · ${$('daySel').value}`;
  $('progress').style.width = slots.length ? `${(slotIdx / slots.length) * 100}%` : '0';

  // RAW
  $('rawSize').textContent = fmtBytes(played.bytes);
  $('rawMeta').textContent = played.n ? `${played.n} of ${total} readings` : 'Press Start to replay the day.';

  // HOT (the simulator's priority lane)
  $('hotSize').innerHTML = `${fmtBytes(SENT.hot.bytes)}${played.hotRaw ? `<small>${pct(SENT.hot.bytes, played.hotRaw)} of its rows</small>` : ''}`;
  $('hotMeta').textContent = SENT.hot.n
    ? `${SENT.hot.n} file${SENT.hot.n > 1 ? 's' : ''} sent · ${snap.prioSent} rows · ${snap.prioPending} waiting`
    : played.hotRaw ? `${snap.prioPending} rows waiting to send` : 'Nothing sent yet.';
  rows('hotList', [...snap.prioRows].reverse(), (el, r) => {
    cell(el, r[0].slice(11, 16), 't'); cell(el, r[1], 'b');
    const v = document.createElement('span'); v.className = `v ${r[3]}`; v.textContent = r[2];
    const st = document.createElement('span'); st.className = `s ${/sent/i.test(r[5]) ? 'sent' : ''}`; st.textContent = /sent/i.test(r[5]) ? 'sent' : 'waiting';
    v.appendChild(st); el.appendChild(v);
  }, 'Potential and Urgent readings show up here.');

  // COLD
  const cold = sim.coldPayload().length;
  $('coldSize').innerHTML = `${fmtBytes(cold)}${played.coldRaw ? `<small>${pct(cold, played.coldRaw)} of its rows</small>` : ''}`;
  $('coldMeta').textContent = snap.coldRows.length
    ? `${snap.coldRows.length} biomarkers summarised${SENT.cold.n ? ` · ${SENT.cold.n} file${SENT.cold.n > 1 ? 's' : ''} sent` : ''}`
    : 'Builds up as Normal readings come in.';
  rows('coldList', snap.coldRows, (el, r) => { cell(el, r[0], 'b'); cell(el, `×${r[1]}`, 'n'); cell(el, r[4], 'v'); }, 'Summary per biomarker: count, min, max, mean.');
}
setInterval(() => { pump(Date.now()); render(); }, 400);

// ===== controls =====
$('btnStart').addEventListener('click', () => (timer ? stop() : start()));
$('btnReset').addEventListener('click', () => { reset(); $('btnStart').disabled = false; });
$('speedSel').addEventListener('change', () => { if (timer) { stop(); start(); } });
$('crewSel').addEventListener('change', loadDay);
$('daySel').addEventListener('change', loadDay);
for (let d = 1; d <= 30; d++) {
  const v = `2026-11-${String(d).padStart(2, '0')}`;
  $('daySel').add(new Option(`Nov ${d}`, v, false, v === DEFAULT_DAY));
}
await loadDay();
