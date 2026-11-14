"""Generate B/C/D crew hot-data files from Crew A's file.

Each crew gets its own baseline offsets and seeded noise, then readings are forced into a target state
so the hazard board is stable all month (rules mirror dashboard/app.js: biomarker.csv yellow = normal
range, red = urgent, otherwise potential):

  B: LDL-cholesterol, ApoB potential          -> Distance + Gravity Potential   (Figma: "Crew B  LDL · ApoB")
  C: Total Sleep Time, Sleep Efficiency potential -> Isolation + Habitat Potential
  D: everything normal                         -> all clear                      (Figma: "Crew D  All clear")

usage: python3 tools/make_crews.py <biomarker.csv> <A csv> <out dir>
"""
import csv, os, random, re, statistics, sys
from collections import defaultdict

rules_path, a_path, out_dir = sys.argv[1:4]

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

with open(a_path, 'rb') as f:
    has_bom = f.read(3) == b'\xef\xbb\xbf'
with open(a_path, encoding='utf-8-sig', newline='') as f:
    text = f.read()
nl = '\r\n' if '\r\n' in text else '\n'
rows = list(csv.reader(text.splitlines()))
head, body = rows[0], rows[1:]
iB, iF = head.index('biomarker'), head.index('figure')

def decimals(s):
    return len(s.split('.')[1]) if '.' in s else 0

def fmt(v, d):
    return f'{v:.{d}f}'

idx = defaultdict(list)
for i, r in enumerate(body):
    idx[r[iB]].append(i)

# A's file was tuned (RBC/HPF +3 -> urgent, SBP -40 from an all-urgent series -> potential); undo that first
BASE = {'RBC/HPF': -3.0, 'Blood Pressure (SBP)': -30.0}
def base(b, i):
    return max(float(body[i][iF]) + BASE.get(b, 0.0), 0.0)

# typical normal value per biomarker (from A's baseline) — fallback when a reading must be pulled back to normal
TYPICAL = {}
for b, ids in idx.items():
    norms = [base(b, i) for i in ids if status(b, base(b, i)) == 'normal']
    TYPICAL[b] = statistics.median(norms) if norms else statistics.median(base(b, i) for i in ids)

# per-crew baseline offsets (additive) and noise level (relative)
CREWS = {
    'B': dict(seed=2026_11_02, noise=0.025, offset={'Heart Rate': -4, 'Blood Pressure (SBP)': -2, 'Blood Pressure (DBP)': -3,
              'Body temperature': -0.08, 'Total Sleep Time': 0.15, 'Mood': 0, 'HbA1c': 0.05},
              targets={'LDL-cholesterol': (112, 172), 'ApoB': (93, 124)}),
    'C': dict(seed=2026_11_03, noise=0.03, offset={'Heart Rate': 5, 'Blood Pressure (SBP)': 3, 'Blood Pressure (DBP)': 2,
              'Body temperature': 0.06, 'LDL-cholesterol': -8, 'ApoB': -6},
              targets={'Total Sleep Time': (6.15, 6.9), 'Sleep Efficiency': (76.5, 84.0)}),
    'D': dict(seed=2026_11_04, noise=0.02, offset={'Heart Rate': -7, 'Blood Pressure (SBP)': -8, 'Blood Pressure (DBP)': -6,
              'Body temperature': -0.04, 'LDL-cholesterol': -12, 'ApoB': -10, 'Total Sleep Time': 0.3},
              targets={}),
}

def build(crew, cfg):
    rnd = random.Random(cfg['seed'])
    out = [list(r) for r in body]
    for b, ids in idx.items():
        vals = [base(b, i) for i in ids]
        lo_a, hi_a = min(vals), max(vals)
        tgt = cfg['targets'].get(b)
        prev_norm = None
        for i in ids:
            d = decimals(body[i][iF])
            v = base(b, i) + cfg['offset'].get(b, 0)
            v *= 1 + rnd.gauss(0, cfg['noise'])
            if tgt:
                # map A's day-to-day shape into the potential band, then make sure it is potential
                span = (hi_a - lo_a) or 1
                v = tgt[0] + (base(b, i) - lo_a) / span * (tgt[1] - tgt[0])
                v = min(max(v * (1 + rnd.gauss(0, cfg['noise'] / 2)), tgt[0]), tgt[1])
                assert status(b, round(v, d)) == 'potential', (crew, b, v)
            else:
                if b in RULES and status(b, round(v, d)) != 'normal':
                    v = prev_norm if prev_norm is not None else TYPICAL[b]
                if b in RULES and status(b, round(v, d)) != 'normal':
                    v = TYPICAL[b]
                if b in RULES:
                    prev_norm = v
                if b not in RULES and b in idx and lo_a >= 0:
                    v = max(v, 0)
            if d == 0:
                v = round(v)
            out[i][iF] = fmt(v, d)
    return out

summary = {}
for crew, cfg in CREWS.items():
    data = build(crew, cfg)
    hz_state = defaultdict(set)
    for r in data:
        b, v = r[iB], float(r[iF])
        if b in RULES:
            hz_state[b].add(status(b, v))
    pot = sorted(b for b, s in hz_state.items() if 'potential' in s)
    urg = sorted(b for b, s in hz_state.items() if 'urgent' in s)
    assert not urg, (crew, urg)
    assert set(pot) == set(cfg['targets']), (crew, pot)
    path = os.path.join(out_dir, f'{crew}_raw.csv')
    with open(path, 'w', encoding='utf-8-sig' if has_bom else 'utf-8', newline='') as f:
        w = csv.writer(f, lineterminator=nl); w.writerow(head); w.writerows(data)
    summary[crew] = (path, len(data), pot)

for crew, (path, n, pot) in summary.items():
    print(f'{crew}: {n} rows -> {path}; potential: {pot or "none (all clear)"}; urgent: none')
