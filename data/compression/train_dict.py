"""Train the shared zstd dictionary for the HOT lane and check it on a day it has not seen.

Samples: Nov 1–12 readings of all four crews, in both formats that get compressed as hot files:
  dashboard  rows only:            2026-11-13,12:05,Blood Pressure (SBP),142.1
  test bench header + rows:        timestamp,Biomarker,Figure,Status / 2026-11-13 12:05:00,Blood Pressure (SBP),142.1,Warning
usage: python -I train_dict.py <biomarker.csv> <crew dir> <out .zdict> [size]
"""
import csv, re, sys
from collections import defaultdict
import zstandard

rules_path, crew_dir, out_path = sys.argv[1:4]
SIZE = int(sys.argv[4]) if len(sys.argv) > 4 else 4096
TRAIN = {f'2026-11-{d:02d}' for d in range(1, 13)}
TEST = '2026-11-13'

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
with open(rules_path, encoding='utf-8-sig', newline='') as f:
    RULES = {r['biomarker']: (parse_rule(r['yellow']), parse_rule(r['red'])) for r in csv.DictReader(f)}
def status(b, v):
    y, red = RULES.get(b, (None, None))
    if red and hit(red, v): return 'urgent'
    if y: return 'normal' if hit(y, v) else 'potential'
    return 'normal'
SIM = {'normal': 'Normal', 'potential': 'Warning', 'urgent': 'Critical'}
def sim_fig(s):                       # the Rust simulator prints f64: 142.0 -> 142, 36.90 -> 36.9
    v = float(s); return str(int(v)) if v == int(v) else repr(v)

rows = defaultdict(list)                  # (crew, date) -> [(time, biomarker, figure, status)]
for crew in 'ABCD':
    with open(f'{crew_dir}/{crew}_hotdata.csv', encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f):
            try: v = float(r['figure'])
            except ValueError: continue
            rows[(crew, r['date'])].append((r['time'], r['biomarker'], r['figure'], status(r['biomarker'], v)))

dash_line = lambda d, r: f'{d},{r[0]},{r[1]},{r[2]}\n'
bench_line = lambda d, r: f'{d} {r[0]}:00,{r[1]},{sim_fig(r[2])},{SIM[r[3]]}\n'
HEAD = 'timestamp,Biomarker,Figure,Status\n'

samples = []
for (crew, d), rs in rows.items():
    if d not in TRAIN: continue
    by = defaultdict(list)
    for r in rs: by[r[0]].append(r)
    for t, g in by.items():             # one sample per reading time, like a hot bundle
        samples.append(''.join(dash_line(d, r) for r in g).encode())
        samples.append((HEAD + ''.join(bench_line(d, r) for r in g)).encode())
dic = zstandard.train_dictionary(SIZE, samples, level=19)
open(out_path, 'wb').write(dic.as_bytes())

def hot_bundles(crew, fmt):
    by = defaultdict(list)
    for r in rows[(crew, TEST)]:
        if r[3] != 'normal': by[r[0]].append(r)
    if fmt == 'dash': return [''.join(dash_line(TEST, r) for r in g).encode() for _, g in sorted(by.items())]
    return [(HEAD + ''.join(bench_line(TEST, r) for r in g)).encode() for _, g in sorted(by.items())]

plain = zstandard.ZstdCompressor(level=19)
withd = zstandard.ZstdCompressor(level=19, dict_data=zstandard.ZstdCompressionDict(dic.as_bytes()))
dd = zstandard.ZstdDecompressor(dict_data=zstandard.ZstdCompressionDict(dic.as_bytes()))
print(f'dictionary: {len(dic.as_bytes()):,} B from {len(samples):,} samples (Nov 1–12, crews A–D)')
for crew in 'ABCD':
    for fmt in ('dash', 'bench'):
        bs = hot_bundles(crew, fmt)
        if not bs: continue
        raw = sum(len(b) for b in bs)
        a = sum(len(plain.compress(b)) for b in bs)
        c = [withd.compress(b) for b in bs]
        assert all(dd.decompress(x) == b for x, b in zip(c, bs))
        d = sum(len(x) for x in c)
        print(f'  crew {crew} {fmt:<5} {len(bs):>3} bundles  raw {raw:>6,} B  zstd {a:>6,} B ({a/raw*100:5.1f}%)  zstd+dict {d:>6,} B ({d/raw*100:5.1f}%)')
