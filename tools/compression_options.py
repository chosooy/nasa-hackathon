"""Same send rule (buffer sent on a NEW Potential/Urgent or every 6 h), different ways to pack each file.

Day under test: 2026-11-13, buffer empty at 00:00. Dictionaries train on Nov 1–12 files made by the same rule.
Every encoding is decoded again and must give back the same readings (time, biomarker, value).
usage: pip install zstandard; python tools/compression_options.py data/biomarker/biomarker.csv data/crew
"""
import csv, re, sys
from collections import defaultdict
import zstandard

rules_path, crew_dir = sys.argv[1:3]
TEST, TRAIN = '2026-11-13', [f'2026-11-{d:02d}' for d in range(1, 13)]

def parse_rule(s):
    if not s or re.search(r'B-?2SD', s, re.I): return None
    out = []
    for p in re.split(r'\s+OR\s+', s, flags=re.I):
        t = p.replace(',', '').strip()
        m = re.match(r'^(<=|>=|<|>|≤|≥)\s*(-?\d+(?:\.\d+)?)', t)
        if m: out.append(({'≤': '<=', '≥': '>='}.get(m[1], m[1]), float(m[2]))); continue
        m = re.match(r'^(-?\d+(?:\.\d+)?)\s*[–—-]\s*(-?\d+(?:\.\d+)?)', t)
        if m: out.append(('range', (float(m[1]), float(m[2]))))
    return out or None
def hit(rule, v):
    return any((op == 'range' and x[0] <= v <= x[1]) or (op == '<' and v < x) or (op == '<=' and v <= x)
               or (op == '>' and v > x) or (op == '>=' and v >= x) for op, x in rule)
RULES = {r['biomarker']: (parse_rule(r['yellow']), parse_rule(r['red'])) for r in csv.DictReader(open(rules_path, encoding='utf-8-sig'))}
def status(b, v):
    y, red = RULES.get(b, (None, None))
    if red and hit(red, v): return 'u'
    if y: return 'n' if hit(y, v) else 'p'
    return 'n'

data = {}                                   # crew -> date -> [(time, b, fig)]
BIOS = set()
for c in 'ABCD':
    d = defaultdict(list)
    for r in csv.DictReader(open(f'{crew_dir}/{c}_raw.csv', encoding='utf-8-sig')):
        d[r['date']].append((r['time'], r['biomarker'], r['figure'])); BIOS.add(r['biomarker'])
    data[c] = d
BIOS = sorted(BIOS); BID = {b: i for i, b in enumerate(BIOS)}           # shared biomarker list, both sides hold it
DEC = defaultdict(int)                                                  # decimals per biomarker (shared too)
for c in data:
    for rs in data[c].values():
        for _, b, f in rs: DEC[b] = max(DEC[b], len(f.split('.')[1]) if '.' in f else 0)

def files_for(c, day):
    """The send rule: buffer every slot, send on a NEW Potential/Urgent or when 6 h old."""
    slots = defaultdict(list)
    for t, b, f in data[c][day]: slots[t].append((t, b, f))
    out, buf, start, prev = [], [], None, {}
    for t in sorted(slots):
        m = int(t[:2]) * 60 + int(t[3:])
        if start is None: start = m
        buf += slots[t]
        sts = [(b, status(b, float(f))) for _, b, f in slots[t]]
        new = any(s != 'n' and prev.get(b) != s for b, s in sts)
        for b, s in sts: prev[b] = s
        if new or m - start + 5 >= 360: out.append((day, buf)); buf, start = [], None
    if buf: out.append((day, buf))          # left in the buffer at midnight (counted so totals cover the day)
    return out

# ---- encodings: each returns bytes and has a decoder for the round-trip check ----
def enc_csv(day, rows): return ''.join(f'{day},{t},{b},{f}\n' for t, b, f in rows).encode()
def dec_csv(blob):
    return [(l.split(',')[1], l.split(',')[2], float(l.split(',')[3])) for l in blob.decode().splitlines()]

def enc_compact(day, rows):        # date once; HHMM, biomarker id, value
    return (day + '\n' + ''.join(f'{t[:2]}{t[3:]},{BID[b]},{f}\n' for t, b, f in rows)).encode()
def dec_compact(blob):
    lines = blob.decode().splitlines()
    return [(f'{l[:2]}:{l[2:4]}', BIOS[int(l.split(',')[1])], float(l.split(',')[2])) for l in lines[1:]]

def uvar(n, out):
    while True:
        b = n & 0x7f; n >>= 7
        if n: out.append(b | 0x80)
        else: out.append(b); return
def zz(n): return (n << 1) ^ (n >> 63)
def unzz(n): return (n >> 1) ^ -(n & 1)
def enc_columns(day, rows):        # per biomarker: id, count, slot deltas, value deltas (scaled ints)
    by = defaultdict(list)
    for t, b, f in rows: by[BID[b]].append((int(t[:2]) * 12 + int(t[3:]) // 5, round(float(f) * 10 ** DEC[BIOS[BID[b]]])))
    out = bytearray(); uvar(len(by), out)
    for i in sorted(by):
        pts = by[i]; uvar(i, out); uvar(len(pts), out)
        ps, pv = 0, 0
        for s, v in pts: uvar(s - ps, out); uvar(zz(v - pv), out); ps, pv = s, v
    return bytes(out)
def dec_columns(blob):
    pos = 0
    def rd():
        nonlocal pos; n = sh = 0
        while True:
            b = blob[pos]; pos += 1; n |= (b & 0x7f) << sh; sh += 7
            if not b & 0x80: return n
    rows = []
    for _ in range(rd()):
        i = rd(); ps = pv = 0
        for _ in range(rd()):
            ps += rd(); pv += unzz(rd())
            rows.append((f'{ps // 12:02d}:{ps % 12 * 5:02d}', BIOS[i], pv / 10 ** DEC[BIOS[i]]))
    return rows

def same(a, b): return sorted(a) == sorted(b)
def truth(rows): return [(t, b, float(f)) for t, b, f in rows]

ENC = {'csv': (enc_csv, dec_csv), 'compact': (enc_compact, dec_compact), 'columns': (enc_columns, dec_columns)}
def train(kind, size=2048):
    samples = [ENC[kind][0](d, rows) for c in 'ABCD' for day in TRAIN for d, rows in files_for(c, day)]
    return zstandard.train_dictionary(size, samples, level=19)
DICT = {k: train(k) for k in ENC}

OPTS = [
    ('a) CSV rows, zstd 19 (now)', 'csv', dict(level=19)),
    ('b) CSV rows, zstd 22', 'csv', dict(level=22)),
    ('c) CSV rows, zstd 19 + dictionary', 'csv', dict(level=19, dic=True)),
    ('d) compact text, zstd 19', 'compact', dict(level=19)),
    ('e) compact text, zstd 19 + dictionary', 'compact', dict(level=19, dic=True)),
    ('f) columns + deltas, zstd 19', 'columns', dict(level=19)),
    ('g) columns + deltas, no zstd', 'columns', dict(level=None)),
    ('h) columns + deltas, zstd 19 + dictionary', 'columns', dict(level=19, dic=True)),
]
res = defaultdict(dict); raw = {}
for c in 'ABCD':
    fl = files_for(c, TEST)
    raw[c] = sum(len(enc_csv(d, r)) for d, r in fl)
    for name, kind, o in OPTS:
        enc, dec = ENC[kind]; total = 0
        for d, rows in fl:
            blob = enc(d, rows)
            assert same(dec(blob), truth(rows)), (name, c)
            if o['level'] is None: total += len(blob); continue
            dic = DICT[kind] if o.get('dic') else None
            z = zstandard.ZstdCompressor(level=o['level'], dict_data=dic) if dic else zstandard.ZstdCompressor(level=o['level'])
            packed = z.compress(blob)
            dz = zstandard.ZstdDecompressor(dict_data=dic) if dic else zstandard.ZstdDecompressor()
            assert dz.decompress(packed) == blob
            total += len(packed)
        res[name][c] = total
print('files per crew:', {c: len(files_for(c, TEST)) for c in 'ABCD'}, '| raw CSV bytes:', raw)
print(f"{'option':<44}" + ''.join(f'{c:>16}' for c in 'ABCD'))
for name, _, _ in OPTS:
    print(f'{name:<44}' + ''.join(f"{res[name][c]:>9,} {res[name][c] / raw[c] * 100:5.1f}%" for c in 'ABCD'))
print('dictionary sizes:', {k: len(v.as_bytes()) for k, v in DICT.items()})
