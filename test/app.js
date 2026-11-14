// KOOK test bench: the ear-worn device simulator and the Mars→Earth compression simulator on one page.
//
// - Device side (ported from minuncho/prep simulator/index.html): replays our crew data one 5-minute slot
//   per tick, lights the sensor the reading comes from, and speaks the matching instruction from
//   data/health_instruction/health_instruction.csv when a biomarker turns Potential or Urgent.
// - Link side (minuncho/prep space-sim, Rust → WebAssembly in ./pkg): the device feeds the same rows to the
//   simulator one by one (Sim.playStep). It keeps the raw stream (hot), summarises Normal rows per
//   biomarker and compresses them with CCSDS 121 (cold), sends anomalies right away (priority, zstd), and
//   logs each file with its Earth arrival time (one-way delay). Mars window only.
// Status rules are the dashboard's: biomarker.csv yellow = normal range, red = urgent, otherwise potential.
// The simulator expects Normal / Warning / Critical, so potential → Warning and urgent → Critical.

const VERSION = new URL(import.meta.url).search;
const { default: init, Sim } = await import(`./pkg/space_sim.js${VERSION}`);

// ===== settings =====
const ROOT = '..';
// one-way light delay: 20 min like the dashboard; ?delay=<minutes> on the Mars window shortens it for testing
const DELAY_MIN = Math.max(0, parseFloat(new URLSearchParams(location.search).get('delay')) || 20);
const TX_DELAY_MS = DELAY_MIN * 60000;
const LINK_BYTES_PER_SEC = 10 * 1024;
const COLD_EVERY_MS = 60 * 60000;         // cold summary on the hour
const PRIO_EVERY_MS = 1000;               // anomalies every second
const ZSTD_LEVEL = 19;
const ZSTD_PKG = 'https://cdn.jsdelivr.net/npm/@bokuweb/zstd-wasm@0.0.27';
const VOICE_LANG = 'en-US';
const MAX_LOG_ROWS = 400;
const DEFAULT_DAY = '2026-11-13';

const $ = (id) => document.getElementById(id);

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
const RULES = {}, INFO = {};
function statusOf(b, v) {
  const r = RULES[b];
  if (!r || Number.isNaN(v)) return 'Normal';
  if (r.red && r.red.some((p) => test1(p, v))) return 'Critical';
  if (r.yellow) return r.yellow.some((p) => test1(p, v)) ? 'Normal' : 'Warning';
  return 'Normal';
}
const LABEL = { Normal: 'Normal', Warning: 'Potential', Critical: 'Urgent' };

// ===== device: parts and which reading comes from which part =====
const PARTS = {
  ppg: { no: 1, name: 'PPG optical sensor', short: 'Heart rate and blood pressure', detail: 'Shines light onto the skin of the ear and reads how much is reflected to track blood flow. Heart rate and blood pressure readings light this part up.' },
  imu: { no: 2, name: 'Accelerometer (IMU)', short: 'Movement → actigraphy, sleep', detail: 'Measures head and body movement. The sleep measures (total sleep time, efficiency, latency, wake after sleep onset) come from this record.' },
  speaker: { no: 3, name: 'Speaker', short: 'Voice guidance output', detail: 'An open-ear speaker aimed at the ear canal. It reads out the health instruction when a reading turns Potential or Urgent.' },
  power: { no: 4, name: 'Battery & wireless', short: 'Power, other readings in, data out', detail: 'Powers the device and links it to the habitat. Readings from other instruments (thermometer pill, blood and urine samples, computer tests) arrive here.' },
};
const partFor = (b, method) => (/^(Heart Rate|Blood Pressure)/.test(b) ? 'ppg' : method === 'device' && /sleep|wake/i.test(b) ? 'imu' : 'power');
const TILES = { 'Heart Rate': 'tileHR', 'Blood Pressure (SBP)': 'tileSBP', 'Body temperature': 'tileTemp' };

// ===== load reference data =====
const [rulesCsv, instrCsv] = await Promise.all([
  fetch(`${ROOT}/data/biomarker/biomarker.csv`).then((r) => r.text()),
  fetch(`${ROOT}/data/health_instruction/health_instruction.csv`).then((r) => r.text()),
]);
parseCSV(rulesCsv).forEach((r) => { RULES[r.biomarker] = { yellow: parseRule(r.yellow), red: parseRule(r.red) }; });
parseCSV(instrCsv).forEach((r) => { INFO[r.biomarker] = r; });

// ===== Rust simulator =====
await init({ module_or_path: new URL(`./pkg/space_sim_bg.wasm${VERSION}`, import.meta.url) });
// Our timestamps are UTC, so the simulator runs with a 0-minute time zone offset.
const sim = new Sim(true, 0, 0, TX_DELAY_MS, LINK_BYTES_PER_SEC, COLD_EVERY_MS, PRIO_EVERY_MS, Date.now());

let zstd = null;
import(`${ZSTD_PKG}/+esm`).then(async (m) => { await m.init(`${ZSTD_PKG}/dist/esm/zstd.wasm`); zstd = m; }).catch((e) => console.error('zstd failed to load', e));
const utf8 = new TextEncoder();
const compress = (text) => zstd.compress(utf8.encode(text), ZSTD_LEVEL);

// ===== dataset: one crew, one day =====
let slots = [], slotIdx = 0, loadedRows = 0, rawBytes = 0;
const records = [];
const lastStatus = {};
async function loadDataset() {
  const crew = $('crewSel').value, day = $('daySel').value;
  $('status').textContent = `Loading Crew ${crew}…`;
  const rows = parseCSV(await fetch(`${ROOT}/data/crew/${crew}_hotdata.csv`).then((r) => r.text()))
    .filter((r) => r.date === day)
    .map((r) => ({ ts: `${r.date} ${r.time}`, b: r.biomarker, fig: r.figure, st: statusOf(r.biomarker, parseFloat(r.figure)) }))
    .sort((a, z) => a.ts.localeCompare(z.ts));
  const csv = 'timestamp,Biomarker,Figure,Status\n' + rows.map((r) => `${r.ts},${r.b},${r.fig},${r.st}`).join('\n') + '\n';
  sim.load(csv);
  rawBytes = utf8.encode(csv).length;
  loadedRows = rows.length;
  slots = [];
  rows.forEach((r) => { if (!slots.length || slots[slots.length - 1][0].ts !== r.ts) slots.push([]); slots[slots.length - 1].push(r); });
  resetDevice();
  $('status').textContent = `Crew ${crew} · ${day}: ${rows.length} readings in ${slots.length} slots`;
  $('btnStart').disabled = false; $('btnReset').disabled = false;
}

// ===== device playback =====
let timer = null;
function deviceTick() {
  if (slotIdx >= slots.length) { stop(); $('status').textContent += ' · finished'; return; }
  const slot = slots[slotIdx++];
  slot.forEach((r) => {
    sim.playStep();                       // the simulator ingests the same row
    records.push(r);
    renderRecord(r);
    const tile = TILES[r.b] && $(TILES[r.b]);
    if (tile) { tile.querySelector('b').textContent = r.fig; tile.classList.toggle('potential', r.st === 'Warning'); tile.classList.toggle('urgent', r.st === 'Critical'); }
    highlightPart(partFor(r.b, (INFO[r.b] || {}).method));
    if (r.st !== 'Normal' && lastStatus[r.b] !== r.st) announce(r);
    lastStatus[r.b] = r.st;
  });
  $('recCount').textContent = `${records.length} records`;
}
function start() {
  if (slotIdx >= slots.length) return;
  sim.setPlaying(true);
  timer = setInterval(deviceTick, +$('speedSel').value);
  $('btnStart').textContent = '■ Pause'; $('btnStart').classList.add('running');
  deviceTick();
}
function stop() {
  clearInterval(timer); timer = null;
  $('btnStart').textContent = '▶ Start'; $('btnStart').classList.remove('running');
}
function resetDevice() {
  stop();
  sim.reset();
  slotIdx = 0; records.length = 0; resetSent();
  Object.keys(lastStatus).forEach((k) => delete lastStatus[k]);
  $('dataLog').innerHTML = '<div class="empty">Press Start to replay the crew\'s readings.</div>';
  $('voiceLog').innerHTML = '<div class="empty">Announced when a reading turns Potential or Urgent.</div>';
  $('recCount').textContent = '0 records';
  Object.values(TILES).forEach((id) => { const t = $(id); t.querySelector('b').textContent = '--'; t.classList.remove('potential', 'urgent'); });
}

// ===== device rendering =====
function span(text, cls) { const s = document.createElement('span'); s.textContent = text; if (cls) s.className = cls; return s; }
function appendToLog(box, node) {
  const empty = box.querySelector('.empty'); if (empty) empty.remove();
  const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.appendChild(node);
  while (box.children.length > MAX_LOG_ROWS) box.firstElementChild.remove();
  if (stick) box.scrollTop = box.scrollHeight;
}
function renderRecord(r) {
  const row = document.createElement('div');
  row.className = 'row';
  row.append(span(r.ts.slice(11), 'ts'), span(r.b), span(r.fig), span(LABEL[r.st], `st-${r.st}`));
  appendToLog($('dataLog'), row);
}
function announce(r) {
  const i = INFO[r.b] || {};
  const guide = (r.st === 'Critical' ? i.red_instruction : i.yellow_instruction) || 'Contact the flight medical officer.';
  const first = guide.split(/(?<=\.)\s/)[0];
  const text = `${r.b} is ${LABEL[r.st]}, ${r.fig}${i.unit ? ' ' + i.unit : ''}. ${first}`;
  const item = document.createElement('div');
  item.className = 'voice';
  const meta = document.createElement('div'); meta.className = 'meta';
  meta.append(span(r.ts.slice(11), 'mono'), span(`${r.b} · ${LABEL[r.st]}`, `tag ${r.st}`));
  const say = document.createElement('div'); say.className = 'say'; say.textContent = text;
  item.append(meta, say);
  appendToLog($('voiceLog'), item);
  if ($('voiceChk').checked) speak(text);
}
let speaking = 0;
const live = new Set();
function speak(text) {
  const svg = $('deviceSvg');
  let finished = false, utter = null;
  const done = () => { if (finished) return; finished = true; if (utter) live.delete(utter); speaking = Math.max(0, speaking - 1); svg.classList.toggle('speaking', speaking > 0); };
  speaking++; svg.classList.add('speaking');
  if (!('speechSynthesis' in window)) { setTimeout(done, 1200 + text.length * 60); return; }
  utter = new SpeechSynthesisUtterance(text);
  utter.lang = VOICE_LANG;
  const v = speechSynthesis.getVoices().find((x) => x.lang === VOICE_LANG) || speechSynthesis.getVoices().find((x) => (x.lang || '').startsWith('en'));
  if (v) utter.voice = v;
  utter.onend = done; utter.onerror = done;
  live.add(utter);
  speechSynthesis.speak(utter);
  setTimeout(done, 4000 + text.length * 120);
}
if ('speechSynthesis' in window) speechSynthesis.getVoices();

const hlTimers = {};
function highlightPart(key) {
  const targets = document.querySelectorAll(`[data-part="${key}"]`);
  targets.forEach((t) => t.classList.remove('active'));
  void $('deviceSvg').getBoundingClientRect();
  targets.forEach((t) => t.classList.add('active'));
  clearTimeout(hlTimers[key]);
  hlTimers[key] = setTimeout(() => targets.forEach((t) => t.classList.remove('active')), 550);
}
for (const [key, p] of Object.entries(PARTS)) {
  const li = document.createElement('li');
  li.dataset.part = key; li.tabIndex = 0;
  const text = document.createElement('div');
  const name = document.createElement('b'); name.textContent = p.name;
  text.append(name, span(p.short));
  li.append(span(String(p.no), 'n'), text);
  $('legend').appendChild(li);
}
let tipOwner = null;
function showTip(target) {
  const p = PARTS[target.dataset.part]; if (!p) return;
  const tip = $('tooltip');
  tipOwner = target;
  tip.innerHTML = '';
  const title = document.createElement('b'); title.textContent = `${p.no}. ${p.name} — ${p.short}`;
  tip.append(title, document.createTextNode(p.detail));
  const a = (target.querySelector('.dot') || target).getBoundingClientRect(), t = tip.getBoundingClientRect();
  let left = Math.max(8, Math.min(a.left + a.width / 2 - t.width / 2, innerWidth - t.width - 8));
  let top = a.bottom + 10; if (top + t.height > innerHeight - 8) top = a.top - t.height - 10;
  tip.style.left = `${left}px`; tip.style.top = `${Math.max(8, top)}px`;
  tip.classList.add('show');
}
const hideTip = () => { tipOwner = null; $('tooltip').classList.remove('show'); };
document.querySelectorAll('[data-part]').forEach((t) => {
  t.addEventListener('mouseenter', () => showTip(t));
  t.addEventListener('mouseleave', hideTip);
  t.addEventListener('focus', () => showTip(t));
  t.addEventListener('blur', hideTip);
  t.addEventListener('click', (e) => { e.stopPropagation(); if (tipOwner === t && e.pointerType !== 'mouse') hideTip(); else showTip(t); });
});
document.addEventListener('click', hideTip);
addEventListener('scroll', hideTip, true);

// ===== link: the simulator asks for files, we compress them, it queues and "sends" them =====
const pendingBytes = new Map();
const SENT = { hot: { n: 0, bytes: 0 }, cold: { n: 0, bytes: 0 }, priority: { n: 0, bytes: 0 } };
const kindOf = (name) => (/priority/i.test(name) ? 'priority' : /cold/i.test(name) ? 'cold' : /hot/i.test(name) ? 'hot' : null);
function pumpRequests(now) {
  if (!zstd) return;
  for (;;) {
    const s = sim.nextRequest(now); if (!s) break;
    const req = JSON.parse(s);
    const bytes = req.encoding === 'ccsds121' ? new Uint8Array(req.bytes) : compress(req.text);
    pendingBytes.set(sim.enqueue(req.kind, req.name, bytes.length), bytes);
  }
}
function pumpDispatch(now) {
  for (;;) {
    const s = sim.dispatch(now); if (!s) break;
    const d = JSON.parse(s);
    const bytes = pendingBytes.get(d.blockId); pendingBytes.delete(d.blockId);
    const k = kindOf(d.name);
    if (k && bytes) { SENT[k].n++; SENT[k].bytes += bytes.length; }
  }
}
function resetSent() { Object.values(SENT).forEach((x) => { x.n = 0; x.bytes = 0; }); }

// ===== link rendering =====
function fillTable(id, headers, rows, numCols = []) {
  const head = document.createElement('tr');
  headers.forEach((h) => { const th = document.createElement('th'); th.textContent = h; head.appendChild(th); });
  const body = rows.map((r) => { const tr = document.createElement('tr'); r.forEach((v, i) => { const td = document.createElement('td'); td.textContent = v; if (numCols.includes(i)) td.className = 'num'; tr.appendChild(td); }); return tr; });
  $(id).replaceChildren(head, ...body);
}
const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
function renderSizes() {
  const texts = JSON.parse(sim.sizeTexts());
  const raw = texts.hot ? utf8.encode(texts.hot).length : 0;
  const prioRaw = texts.prio ? utf8.encode(texts.prio).length : 0;
  const z = (t) => (!t ? 0 : zstd ? compress(t).length : null);
  const cell = (n) => (n === null ? 'Loading zstd…' : fmtBytes(n));
  const pct = (n, base = raw) => (n === null || !base ? '' : `${((n / base) * 100).toFixed(1)}%`);
  const hot = z(texts.hot), cold = sim.coldPayload().length, prio = z(texts.prio);
  const sec = (t) => [t, '', ''];
  const files = (k) => (SENT[k].n ? `${SENT[k].n} file${SENT[k].n > 1 ? 's' : ''} · ${fmtBytes(SENT[k].bytes)}` : '0 files');
  const rows = [
    ['Day file (all rows, raw CSV)', fmtBytes(rawBytes), ''],
    ['Played rows, raw CSV', fmtBytes(raw), raw ? '100%' : ''],
    sec('If compressed in one go (reference)'),
    ['hot: all played rows, zstd', cell(hot), pct(hot)],
    ['cold: per-biomarker summary, CCSDS 121', fmtBytes(cold), pct(cold)],
    ['priority: Potential/Urgent rows, zstd', cell(prio), pct(prio)],
    sec('Files actually sent so far'),
    ['priority files (each zstd on its own)', files('priority'), pct(SENT.priority.bytes, prioRaw) && `${pct(SENT.priority.bytes, prioRaw)} of its rows`],
    ['cold files (CCSDS 121)', files('cold'), ''],
  ];
  if (SENT.hot.n) rows.push(['hot files', files('hot'), '']);
  const head = document.createElement('tr');
  ['', 'Size', 'vs raw'].forEach((h) => { const th = document.createElement('th'); th.textContent = h; head.appendChild(th); });
  $('sizeTable').replaceChildren(head, ...rows.map((r) => {
    const tr = document.createElement('tr');
    if (r[1] === '' && r[2] === '') { tr.className = 'sec'; const td = document.createElement('td'); td.colSpan = 3; td.textContent = r[0]; tr.appendChild(td); return tr; }
    r.forEach((v, i) => { const td = document.createElement('td'); td.textContent = v; if (i) td.className = 'num'; tr.appendChild(td); });
    return tr;
  }));
}
function render(snap) {
  $('clock').textContent = snap.clock;
  $('date').textContent = `${snap.date} · UTC`;
  fillTable('blockTable', ['block', 'Clock', 'Send start', 'File', 'Size', 'Status', 'ETA'], snap.blocks);
  {
    $('sendInfo').textContent = `next ${snap.nextCold}`;
    $('priorityStatus').textContent = `pending ${snap.prioPending} · sent ${snap.prioSent}`;
    fillTable('coldTable', ['Biomarker', 'count', 'min', 'max', 'mean', 'start', 'end'], snap.coldRows, [1, 2, 3, 4]);
    fillTable('prioTable', ['timestamp', 'Biomarker', 'Figure', 'Status', 'Reason', 'State'], snap.prioRows);
    renderSizes();
  }
}
function tick() {
  const now = Date.now();
  pumpRequests(now);
  pumpDispatch(now);
  render(JSON.parse(sim.snapshot(now)));
}
setInterval(tick, 400);

// ===== controls =====
$('btnStart').addEventListener('click', () => (timer ? stop() : start()));
$('btnReset').addEventListener('click', resetDevice);
$('speedSel').addEventListener('change', () => { if (timer) { stop(); start(); } });
$('crewSel').addEventListener('change', loadDataset);
$('daySel').addEventListener('change', loadDataset);
$('flushBtn').addEventListener('click', () => sim.force('cold'));
$('priorityBtn').addEventListener('click', () => sim.force('priority'));
$('blockDownload').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([sim.blocksCsv(Date.now())], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = 'blocks.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
for (let d = 1; d <= 30; d++) {
  const v = `2026-11-${String(d).padStart(2, '0')}`;
  $('daySel').add(new Option(v, v, false, v === DEFAULT_DAY));
}
await loadDataset();
tick();
