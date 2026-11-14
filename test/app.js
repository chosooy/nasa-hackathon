// KOOK test bench: replays one crew's day through the same data flow as the dashboard.
//
//   RAW                  device readings, one 5-minute slot at a time (CSV rows)
//   ASTRONAUT DASHBOARD  shows every reading right away and keeps it in a buffer; the buffer is packed as
//                        columns + deltas, zstd-compressed
//                        into one file and sent when a biomarker NEWLY turns Potential/Urgent, or every 6 hours
//   DOCTOR DASHBOARD     each file reaches Earth 20 minutes after it was sent (one-way light time)
//
// Every file is decompressed again and compared with its rows. Status (for colour only) follows the
// dashboard's rules: biomarker.csv yellow = normal range, red = urgent, otherwise potential.

const ROOT = '..';
const LIGHT_MIN = 20;
const ZSTD_LEVEL = 19;
const ZSTD_PKG = 'https://cdn.jsdelivr.net/npm/@bokuweb/zstd-wasm@0.0.22';
const DEFAULT_DAY = '2026-11-13';
const MAX_ROWS = 300;
const CAP_MIN = 6 * 60;                           // send the buffer at least every 6 hours

const $ = (id) => document.getElementById(id);
const utf8 = new TextEncoder(), unutf8 = new TextDecoder();
const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '');
const addMin = (hhmm, m) => { const t = (+hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5) + m) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

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
  if (!r || Number.isNaN(v)) return 'normal';
  if (r.red && r.red.some((p) => test1(p, v))) return 'urgent';
  if (r.yellow) return r.yellow.some((p) => test1(p, v)) ? 'normal' : 'potential';
  return 'normal';
}
const worst = (list) => (list.some((r) => r.st === 'urgent') ? 'urgent' : list.some((r) => r.st === 'potential') ? 'potential' : 'normal');

parseCSV(await fetch(`${ROOT}/data/biomarker/biomarker.csv`).then((r) => r.text()))
  .forEach((r) => { RULES[r.biomarker] = { yellow: parseRule(r.yellow), red: parseRule(r.red) }; });
const INFO = {};
parseCSV(await fetch(`${ROOT}/data/health_instruction/health_instruction.csv`).then((r) => r.text()))
  .forEach((r) => { INFO[r.biomarker] = r; });

// ===== voice guidance: when a biomarker newly turns Potential/Urgent, read its instruction aloud =====
// Uses the browser's built-in speech (Web Speech API). Playback waits while the device is speaking,
// so every announcement is heard in full. Clicking Start unlocks audio in the browser.
let speaking = false;
function announce(list) {
  const r = list.find((x) => x.st === 'urgent') || list[0];
  const i = INFO[r.b] || {};
  const guide = (r.st === 'urgent' ? i.red_instruction : i.yellow_instruction) || 'Contact the flight medical officer.';
  const first = guide.split(/(?<=\.)\s/)[0];
  const label = r.st === 'urgent' ? 'Urgent' : 'Potential';
  const text = `${r.b} is ${label}, ${r.fig}${i.unit ? ' ' + i.unit : ''}. ${first}`;
  $('sayLine').innerHTML = '';
  const b = document.createElement('b'); b.textContent = `🔊 ${r.b} · ${label}`; if (r.st === 'urgent') b.className = 'urgent';
  $('sayLine').append(b, document.createTextNode(` — ${first}`));
  if (!$('voiceChk').checked || !('speechSynthesis' in window)) return;
  speaking = true;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  const v = speechSynthesis.getVoices().find((x) => x.lang === 'en-US') || speechSynthesis.getVoices().find((x) => (x.lang || '').startsWith('en'));
  if (v) u.voice = v;
  const done = () => { speaking = false; };
  u.onend = done; u.onerror = done;
  setTimeout(done, 4000 + text.length * 90);          // in case the browser never fires onend
  speechSynthesis.speak(u);
}
function hush() { speaking = false; if ('speechSynthesis' in window) speechSynthesis.cancel(); }
if ('speechSynthesis' in window) speechSynthesis.getVoices();

let zstd = null;
const zstdReady = import(`${ZSTD_PKG}/+esm`).then(async (m) => { await m.init(`${ZSTD_PKG}/dist/web/zstd.wasm`); zstd = m; })
  .catch((e) => { console.error('zstd failed to load', e); $('astroMeta').textContent = 'The zstd encoder could not load. Check the connection and reload.'; });

// ===== state =====
let slots = [], slotIdx = 0, timer = null, total = 0, crew = 'A', day = DEFAULT_DAY;
const files = [];                                  // sent: { time, from, arrive, n, raw, zst, ok, st, reason, trig }
const sum = { readings: 0, raw: 0 };
let buf = [], bufFrom = null, prev = {};
const toMin = (hhmm) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);

async function loadDay() {
  stop();
  crew = $('crewSel').value; day = $('daySel').value;
  const rows = parseCSV(await fetch(`${ROOT}/data/crew/${crew}_raw.csv`).then((r) => r.text()))
    .filter((r) => r.date === day)
    .map((r) => ({ date: r.date, time: r.time, b: r.biomarker, fig: r.figure, st: statusOf(r.biomarker, parseFloat(r.figure)) }))
    .sort((a, z) => a.time.localeCompare(z.time));
  slots = [];
  rows.forEach((r) => { if (!slots.length || slots[slots.length - 1][0].time !== r.time) slots.push([]); slots[slots.length - 1].push(r); });
  total = rows.length;
  reset();
  $('btnReset').disabled = false;
}
function reset() {
  stop();
  slotIdx = 0; files.length = 0; sum.readings = 0; sum.raw = 0; buf = []; bufFrom = null; prev = {};
  $('rawList').innerHTML = '<div class="empty">Press Start to replay the day.</div>';
  $('sayLine').textContent = '';
  hush();
  $('btnStart').disabled = !slots.length;
  render();
}

// ===== playback: one 5-minute slot per tick =====
function step() {
  if (speaking) return;                                     // wait until the announcement ends
  if (slotIdx >= slots.length) { stop(); $('btnStart').disabled = true; render(); return; }
  const slot = slots[slotIdx++];
  const t = slot[0].time;
  if (bufFrom === null) bufFrom = t;
  buf.push(...slot);
  sum.readings += slot.length; sum.raw += utf8.encode(slot.map((r) => `${r.date},${r.time},${r.b},${r.fig}\n`).join('')).length;
  const newly = slot.filter((r) => r.st !== 'normal' && prev[r.b] !== r.st);
  slot.forEach((r) => { prev[r.b] = r.st; });
  if (newly.length) { send(t, 'new', newly); announce(newly); }
  else if (toMin(t) - toMin(bufFrom) + 5 >= CAP_MIN) send(t, 'cap', []);

  const box = $('rawList');
  const empty = box.querySelector('.empty'); if (empty) empty.remove();
  const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  slot.forEach((r) => box.appendChild(row([[r.time, 't'], [r.b, 'b'], [r.fig, `v ${r.st}`]])));
  while (box.children.length > MAX_ROWS) box.firstElementChild.remove();
  if (stick) box.scrollTop = box.scrollHeight;
  render();
}
/* ---------- packed file format: columns + deltas, then zstd ----------
 * Both sides load data/biomarker/biomarker.csv; its row order gives every biomarker an id.
 *   varint day      days since 2026-01-01 of the file's first reading
 *   varint groups   number of biomarkers in the file
 *   per biomarker:  varint id · byte decimals · varint count ·
 *                   count × (varint Δminutes, varint zigzag Δvalue)
 * Minutes count from 00:00 of `day` (a file may cross midnight); values are scaled by 10^decimals,
 * so 142.1 with 1 decimal is 1421. Each number is the change from the previous one, so readings that
 * barely move become runs of tiny numbers that zstd squeezes very well. */
const PACK_EPOCH = Date.UTC(2026, 0, 1);
const PACK_DAY_MS = 86400000;
function uvar(n, out) { do { const b = n % 128; n = Math.floor(n / 128); out.push(n ? b + 128 : b); } while (n); }
const zigzag = (n) => (n >= 0 ? 2 * n : -2 * n - 1);
const unzigzag = (n) => (n % 2 ? -(n + 1) / 2 : n / 2);
const decimalsOf = (s) => { const i = String(s).indexOf('.'); return i < 0 ? 0 : String(s).length - i - 1; };
/** rows: [{ b, ts (ms UTC), v (number), dec (decimals) }] → Uint8Array */
function packReadings(rows, ids) {
  const day = Math.floor((Math.min(...rows.map((r) => r.ts)) - PACK_EPOCH) / PACK_DAY_MS);
  const base = PACK_EPOCH + day * PACK_DAY_MS;
  const by = new Map();
  rows.forEach((r) => {
    const id = ids[r.b];
    if (id === undefined) throw new Error(`${r.b} is not in biomarker.csv`);
    if (!by.has(id)) by.set(id, []);
    by.get(id).push(r);
  });
  const out = [];
  uvar(day, out); uvar(by.size, out);
  [...by.keys()].sort((a, z) => a - z).forEach((id) => {
    const list = by.get(id).slice().sort((a, z) => a.ts - z.ts);
    const dec = Math.max(...list.map((r) => r.dec));
    uvar(id, out); out.push(dec); uvar(list.length, out);
    let pm = 0, pv = 0;
    list.forEach((r) => {
      const m = Math.round((r.ts - base) / 60000), v = Math.round(r.v * 10 ** dec);
      uvar(m - pm, out); uvar(zigzag(v - pv), out); pm = m; pv = v;
    });
  });
  return Uint8Array.from(out);
}
/** Uint8Array → [{ b, ts, v }] */
function unpackReadings(bytes, names) {
  let pos = 0;
  const rd = () => { let n = 0, mul = 1, b; do { b = bytes[pos++]; n += (b % 128) * mul; mul *= 128; } while (b >= 128); return n; };
  const base = PACK_EPOCH + rd() * PACK_DAY_MS, rows = [];
  for (let g = rd(); g > 0; g--) {
    const b = names[rd()], dec = bytes[pos++];
    let m = 0, v = 0;
    for (let k = rd(); k > 0; k--) { m += rd(); v += unzigzag(rd()); rows.push({ b, ts: base + m * 60000, v: v / 10 ** dec }); }
  }
  return rows;
}
/** Same readings, same times, same values (to each biomarker's decimals)? */
function sameReadings(a, b) {
  const key = (r) => `${r.b}|${r.ts}|${Math.round(r.v * 1e6)}`;
  const ka = a.map(key).sort(), kb = b.map(key).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
}

const bioNames = () => Object.keys(RULES);                     // biomarker.csv row order = id
let ids = null;

// the buffer goes out as one file: packed as columns + deltas, then zstd
function send(time, reason, newly) {
  const raw = utf8.encode(buf.map((r) => `${r.date},${r.time},${r.b},${r.fig}\n`).join(''));   // CSV size, for comparison
  ids = ids || Object.fromEntries(bioNames().map((b, i) => [b, i]));
  const readings = buf.map((r) => ({ b: r.b, ts: Date.parse(`${r.date}T${r.time}:00Z`), v: parseFloat(r.fig), dec: decimalsOf(r.fig) }));
  const packed = zstd.compress(packReadings(readings, ids), ZSTD_LEVEL);
  const ok = sameReadings(readings, unpackReadings(zstd.decompress(packed), bioNames()));
  files.push({ time, from: bufFrom, arrive: addMin(time, LIGHT_MIN), n: buf.length, raw: raw.length, zst: packed.length, ok,
    st: reason === 'new' ? worst(newly) : 'normal', reason, trig: [...new Set(newly.map((r) => r.b))] });
  buf = []; bufFrom = null;
}
async function start() {
  if (slotIdx >= slots.length) return;
  await zstdReady; if (!zstd) return;
  timer = setInterval(step, +$('speedSel').value);
  $('btnStart').textContent = 'Pause';
  step();
}
function stop() { clearInterval(timer); timer = null; $('btnStart').textContent = 'Start'; hush(); }

// ===== render =====
function row(cells) {
  const el = document.createElement('div'); el.className = 'r';
  cells.forEach(([text, cls]) => { const s = document.createElement('span'); s.textContent = text; if (cls) s.className = cls; el.appendChild(s); });
  return el;
}
function fill(id, list, make, emptyText) {
  const box = $(id);
  if (!list.length) { box.innerHTML = `<div class="empty">${emptyText}</div>`; return; }
  const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.replaceChildren(...list.slice(-MAX_ROWS).map(make));
  if (stick) box.scrollTop = box.scrollHeight;
}
function render() {
  const now = slotIdx ? slots[slotIdx - 1][0].time : null;
  if (!$('stampImg').src.endsWith(`${crew}_profile.jpg`)) { $('stampImg').src = `${ROOT}/assets/image/web/${crew}_profile.jpg`; $('stampImg').alt = `Crew ${crew}`; }
  $('stampDate').textContent = day;
  $('stampTime').textContent = now || '--:--';
  $('progress').style.width = slots.length ? `${(slotIdx / slots.length) * 100}%` : '0';

  // RAW
  $('rawSize').textContent = fmtBytes(sum.raw);
  $('rawMeta').textContent = sum.readings ? `${sum.readings} of ${total} readings` : 'Press Start to replay the day.';

  // ASTRONAUT: every reading right away; files leave on a new Potential/Urgent or every 6 h
  const zst = files.reduce((n, f) => n + f.zst, 0), sentRaw = files.reduce((n, f) => n + f.raw, 0);
  const bad = files.filter((f) => !f.ok).length;
  $('astroSize').innerHTML = files.length ? `${fmtBytes(zst)}<small>${pct(zst, sentRaw)} of its CSV</small>` : '0 B';
  $('astroMeta').textContent = sum.readings
    ? `${files.length} file${files.length === 1 ? '' : 's'} sent${bad ? ` · ${bad} failed the check` : files.length ? ' · all verified' : ''} · ${buf.length} reading${buf.length === 1 ? '' : 's'} in the buffer${bufFrom ? ` since ${bufFrom}` : ''}`
    : 'Sends its buffer on a new Potential/Urgent, or every 6 hours.';
  fill('astroList', files, (f) => row([[f.time, 't'], [f.reason === 'new' ? f.trig.join(', ') : '6-hour send', 'b'], [`${fmtBytes(f.raw)} → ${fmtBytes(f.zst)}`, `v ${f.st}`]]), 'Nothing sent yet. Readings wait in the buffer.');

  // DOCTOR: each file 20 minutes after it was sent (replay time; files sent after 23:40 arrive the next day)
  const got = now ? files.filter((f) => f.arrive <= now && f.arrive >= f.time) : [];
  const transit = files.length - got.length;
  const docBytes = got.reduce((n, f) => n + f.zst, 0);
  const latest = got.length ? got[got.length - 1].time : null;
  $('docSize').innerHTML = got.length ? `${fmtBytes(docBytes)}<small>${got.length} file${got.length > 1 ? 's' : ''}</small>` : '0 B';
  $('docMeta').textContent = sum.readings
    ? `${latest ? `Has readings up to ${latest}` : 'Nothing has arrived yet'}${transit ? ` · ${transit} in transit` : ''}`
    : 'Each file arrives 20 minutes after it was sent.';
  fill('docList', got, (f) => row([[f.arrive, 't'], [`${f.n} readings ${f.from}–${f.time}`, 'b'], [fmtBytes(f.zst), `v ${f.st}`]]), `Each file arrives ${LIGHT_MIN} minutes after it was sent.`);
}

// ===== controls =====
$('btnStart').addEventListener('click', () => (timer ? stop() : start()));
$('btnReset').addEventListener('click', reset);
$('voiceChk').addEventListener('change', () => { if (!$('voiceChk').checked) hush(); });
$('speedSel').addEventListener('change', () => { if (timer) { stop(); start(); } });
$('crewSel').addEventListener('change', loadDay);
$('daySel').addEventListener('change', loadDay);
for (let d = 1; d <= 30; d++) {
  const v = `2026-11-${String(d).padStart(2, '0')}`;
  $('daySel').add(new Option(`Nov ${d}`, v, false, v === DEFAULT_DAY));
}
await loadDay();
