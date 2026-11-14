"""Build a crew data file whose hazard board shows Distance=Urgent, Gravity=Potential,
Radiation/Isolation/Habitat=Normal at every moment of the month.

- RBC/HPF (hazard: distance only): +3 to every reading -> always >=3 (urgent)
- Blood Pressure (SBP) (distance, gravity): -40 mmHg -> 140-145 (potential, never urgent)
- every biomarker linked to radiation, isolation or habitat: non-normal readings take the
  nearest earlier normal reading of the same biomarker (later one / median as fallback)
- distance/gravity-only biomarkers keep their potential readings (they cannot change the mix)

Status rules mirror dashboard/app.js (biomarker.csv yellow = normal range, red = urgent).
usage: python3 tools/hazard_mix.py <biomarker.csv> <health_instruction.csv> <in crew csv> <out crew csv>
"""
import csv, re, sys, statistics
from collections import Counter, defaultdict

rules_path, instr_path, src, dst = sys.argv[1:5]

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
    rules = {r['biomarker']: (parse_rule(r['yellow']), parse_rule(r['red'])) for r in csv.DictReader(f)}
with open(instr_path, encoding='utf-8-sig', newline='') as f:
    hz = {r['biomarker']: {h.strip() for h in r['hazard'].split(',') if h.strip()} for r in csv.DictReader(f)}

def status(b, v):
    y, red = rules.get(b, (None, None))
    if red and hit(red, v): return 'urgent'
    if y: return 'normal' if hit(y, v) else 'potential'
    return 'normal'

with open(src, 'rb') as f:
    has_bom = f.read(3) == b'\xef\xbb\xbf'
with open(src, encoding='utf-8-sig', newline='') as f:
    text = f.read()
nl = '\r\n' if '\r\n' in text else '\n'
rows = list(csv.reader(text.splitlines()))
head, body = rows[0], rows[1:]
iB, iF = head.index('biomarker'), head.index('figure')

def fmt(old, v):  # keep the original number of decimals
    d = len(old.split('.')[1]) if '.' in old else 0
    return f'{v:.{d}f}'

idx = defaultdict(list)
for i, r in enumerate(body):
    idx[r[iB]].append(i)

changed = Counter()
for i in idx['RBC/HPF']:
    body[i][iF] = fmt(body[i][iF], float(body[i][iF]) + 3); changed['RBC/HPF'] += 1
for i in idx['Blood Pressure (SBP)']:
    body[i][iF] = fmt(body[i][iF], float(body[i][iF]) - 40); changed['Blood Pressure (SBP)'] += 1

calm = {'radiation', 'isolation', 'habitat'}
for b, ids in idx.items():
    if b in ('RBC/HPF', 'Blood Pressure (SBP)') or not (hz.get(b, set()) & calm):
        continue
    st = {i: status(b, float(body[i][iF])) for i in ids}
    normals = [i for i in ids if st[i] == 'normal']
    med = statistics.median(float(body[i][iF]) for i in normals) if normals else None
    for k, i in enumerate(ids):
        if st[i] == 'normal':
            continue
        prev = next((j for j in reversed(ids[:k]) if st[j] == 'normal'), None)
        nxt = next((j for j in ids[k + 1:] if st[j] == 'normal'), None)
        srcj = prev if prev is not None else nxt
        body[i][iF] = body[srcj][iF] if srcj is not None else fmt(body[i][iF], med)
        changed[b] += 1

# verify: worst status per hazard across all readings must be exactly the target at all times
worst = defaultdict(set)
for r in body:
    for h in hz.get(r[iB], ()):
        worst[h].add(status(r[iB], float(r[iF])))
assert all(status('RBC/HPF', float(body[i][iF])) == 'urgent' for i in idx['RBC/HPF'])
assert all(status('Blood Pressure (SBP)', float(body[i][iF])) == 'potential' for i in idx['Blood Pressure (SBP)'])
for h in ('radiation', 'isolation', 'habitat'):
    assert worst[h] <= {'normal'}, (h, worst[h])
assert 'urgent' not in worst['gravity'], worst['gravity']

with open(dst, 'w', encoding='utf-8-sig' if has_bom else 'utf-8', newline='') as f:
    w = csv.writer(f, lineterminator=nl); w.writerow(head); w.writerows(body)
print('rows changed:', sum(changed.values()))
for b, c in sorted(changed.items()):
    print(f'  {b}: {c}')
print('hazard states seen over the month:', {h: sorted(s) for h, s in sorted(worst.items())})
print('written:', dst)
