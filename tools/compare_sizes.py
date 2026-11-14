"""Compare transmission sizes for one 24 h day of a crew's biomarker data.

1. raw CSV                          (date,time,biomarker,figure — same payload the dashboard builds)
2. all zstd (level 19)              whole day compressed once
3. all CCSDS                        whole day raw, split into CCSDS Space Packets (no compression)
4. split, as the dashboard does     Potential/Urgent -> 1-minute zstd bundles (hot)
                                    Normal -> hourly batches, zstd + CCSDS (cold)
(+ reference: whole day zstd + CCSDS)

Status rules mirror dashboard/app.js: biomarker.csv yellow = normal range, red = urgent, else potential.
usage: python tools/compare_sizes.py <biomarker.csv> <crew csv> <YYYY-MM-DD>
"""
import csv, re, sys
from collections import defaultdict
import zstandard

rules_path, crew_path, day = sys.argv[1:4]
LEVEL, MAX_DATA = 19, 1018

def parse_rule(s):
    if not s or re.search(r'B-?2SD', s, re.I):
        return None
    out = []
    for p in re.split(r'\s+OR\s+', s, flags=re.I):
        t = p.replace(',', '').strip()
        m = re.match(r'^(<=|>=|<|>|≤|≥)\s*(-?\d+(?:\.\d+)?)', t)
        if m:
            out.append(({'≤': '<=', '≥': '>='}.get(m[1], m[1]), float(m[2]))); continue
        m = re.match(r'^(-?\d+(?:\.\d+)?)\s*[–—-]\s*(-?\d+(?:\.\d+)?)', t)
        if m:
            out.append(('range', (float(m[1]), float(m[2]))))
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

with open(crew_path, encoding='utf-8-sig', newline='') as f:
    rows = []
    for r in csv.DictReader(f):
        if r['date'] != day: continue
        try: v = float(r['figure'])
        except ValueError: continue
        rows.append((r['date'], r['time'], r['biomarker'], r['figure'], status(r['biomarker'], v)))
rows.sort(key=lambda r: r[1])

def to_csv(rs):
    return ('date,time,biomarker,figure\n' + ''.join(f'{d},{t},{b},{fig}\n' for d, t, b, fig, _ in rs)).encode()

cctx = zstandard.ZstdCompressor(level=LEVEL)
zst = lambda b: cctx.compress(b)

def ccsds_size(payload_len):
    """Bytes on the wire: per packet 6 B primary + 6 B CUC secondary header + data + 2 B CRC."""
    n = max(1, -(-payload_len // MAX_DATA))
    return payload_len + n * 14, n

raw = to_csv(rows)
r_raw = len(raw)
r_zstd = len(zst(raw))
r_ccsds, n_ccsds = ccsds_size(r_raw)
r_zc, n_zc = ccsds_size(r_zstd)

hot = [r for r in rows if r[4] in ('potential', 'urgent')]
cold = [r for r in rows if r[4] == 'normal']
by_min = defaultdict(list)
for r in hot: by_min[r[1]].append(r)                 # time is HH:MM, so one key per minute
hot_bytes = sum(len(zst(to_csv(rs))) for rs in by_min.values())
hot_raw = sum(len(to_csv(rs)) for rs in by_min.values())
by_hour = defaultdict(list)
for r in cold: by_hour[r[1][:2]].append(r)
cold_bytes, cold_pkts, cold_raw = 0, 0, 0
for rs in by_hour.values():
    b = to_csv(rs); cold_raw += len(b)
    w, n = ccsds_size(len(zst(b))); cold_bytes += w; cold_pkts += n

def line(name, n, note=''):
    print(f'{name:<44} {n:>8,} B  {n / 1024:>7.1f} KB  {n / r_raw * 100:>6.1f}%  {note}')

print(f'Day {day}: {len(rows)} readings ({len(hot)} potential/urgent, {len(cold)} normal)\n')
line('1. raw CSV', r_raw)
line('2. all zstd (whole day, level 19)', r_zstd)
line('3. all CCSDS (whole day, no compression)', r_ccsds, f'{n_ccsds} packets')
line('4. split: hot + cold', hot_bytes + cold_bytes)
line('   hot  (pot/urg, 1-min zstd bundles)', hot_bytes, f'{len(by_min)} bundles, raw {hot_raw:,} B')
line('   cold (normal, hourly zstd + CCSDS)', cold_bytes, f'{len(by_hour)} batches, {cold_pkts} packets, raw {cold_raw:,} B')
line('(ref) whole day zstd + CCSDS', r_zc, f'{n_zc} packets')
