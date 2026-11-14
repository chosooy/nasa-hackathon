"""How to shrink tiny hot bundles: compare options on Crew A, 2026-11-13 (Potential/Urgent rows only).

a) 1-min bundles, CSV header + rows, zstd 19                 (dashboard today)
b) 1-min bundles, rows only (no header), raw                  (skip zstd)
c) 1-min bundles, rows only, zstd 19
d) 1-min bundles, rows only, zstd 19 + shared dictionary      (dictionary trained on Nov 1–12 rows, both sides hold it)
e) 1-s accumulation (= one bundle per reading time here, readings are 5 min apart) -> same as a) on this data
f) whole day of hot rows compressed once (reference: what the test page's size table shows)
usage: python tools/hot_bundle_options.py <biomarker.csv> <crew csv>
"""
import csv, re, sys
from collections import defaultdict
import zstandard

rules_path, crew_path = sys.argv[1:3]
DAY, TRAIN_DAYS = '2026-11-13', [f'2026-11-{d:02d}' for d in range(1, 13)]

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

rows = defaultdict(list)
with open(crew_path, encoding='utf-8-sig', newline='') as f:
    for r in csv.DictReader(f):
        try: v = float(r['figure'])
        except ValueError: continue
        rows[r['date']].append((r['time'], f"{r['date']},{r['time']},{r['biomarker']},{r['figure']}\n"))

HEAD = 'date,time,biomarker,figure\n'
def bundles(day, hot_only=True):
    by = defaultdict(list)
    for t, line in rows[day]:
        b = line.split(',')[2]; v = float(line.rstrip().split(',')[3])
        if not hot_only or status(b, v) != 'normal': by[t].append(line)
    return [''.join(v) for _, v in sorted(by.items())]

day_b = bundles(DAY)
z = zstandard.ZstdCompressor(level=19)
# dictionary: trained on earlier days' rows (all statuses), so both ends can hold it before the mission
samples = [line.encode() for d in TRAIN_DAYS for _, line in rows[d]]
dic = zstandard.train_dictionary(2048, samples)
zd = zstandard.ZstdCompressor(level=19, dict_data=dic)
zd_noid = zstandard.ZstdCompressor(level=19, dict_data=dic, write_checksum=False, write_content_size=False, write_dict_id=False)

raw_with_head = sum(len((HEAD + b).encode()) for b in day_b)
res = {
    'a) header + rows, zstd (dashboard now)': sum(len(z.compress((HEAD + b).encode())) for b in day_b),
    'b) rows only, no compression': sum(len(b.encode()) for b in day_b),
    'c) rows only, zstd': sum(len(z.compress(b.encode())) for b in day_b),
    'd) rows only, zstd + shared dictionary': sum(len(zd.compress(b.encode())) for b in day_b),
    'd2) same, frame header trimmed': sum(len(zd_noid.compress(b.encode())) for b in day_b),
    'f) whole day of hot rows at once, zstd': len(z.compress((HEAD + ''.join(day_b)).encode())),
}
print(f'{DAY}: {len(day_b)} bundles, {sum(b.count(chr(10)) for b in day_b)} hot rows; raw with header {raw_with_head:,} B; dictionary {len(dic.as_bytes()):,} B')
for k, v in res.items():
    print(f'{k:<44} {v:>8,} B  {v / raw_with_head * 100:6.1f}%  avg {v / len(day_b):6.1f} B/bundle')
