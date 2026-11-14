"""Turn every Urgent reading (except Blood Pressure (SBP)) in a crew data CSV into a Normal one.

Status rules mirror dashboard/app.js: biomarker.csv `red` = Urgent, `yellow` = normal range,
outside yellow (and not red) = Potential. Potential readings are left untouched.
Replacement value: the nearest earlier Normal reading of the same biomarker
(falls back to the nearest later one, then the median of Normal readings).

usage: python3 tools/normalize_urgent.py <rules biomarker.csv> <crew csv> [--write]
"""
import csv, re, sys, statistics
from collections import Counter, defaultdict

rules_path, data_path = sys.argv[1], sys.argv[2]
write = '--write' in sys.argv
SKIP = {'Blood Pressure (SBP)'}

def parse_rule(s):
    if not s or re.search(r'B-?2SD', s, re.I):
        return None
    parts = []
    for p in re.split(r'\s+OR\s+', s, flags=re.I):
        t = p.replace(',', '').strip()
        m = re.match(r'^(<=|>=|<|>|≤|≥)\s*(-?\d+(?:\.\d+)?)', t)
        if m:
            parts.append(({'≤': '<=', '≥': '>='}.get(m[1], m[1]), float(m[2]))); continue
        m = re.match(r'^(-?\d+(?:\.\d+)?)\s*[–—-]\s*(-?\d+(?:\.\d+)?)', t)
        if m:
            parts.append(('range', (float(m[1]), float(m[2]))))
    return parts or None

def hit(rule, v):
    for op, x in rule:
        if op == 'range' and x[0] <= v <= x[1]: return True
        if op == '<' and v < x: return True
        if op == '<=' and v <= x: return True
        if op == '>' and v > x: return True
        if op == '>=' and v >= x: return True
    return False

rules = {}
with open(rules_path, encoding='utf-8-sig', newline='') as f:
    for r in csv.DictReader(f):
        rules[r['biomarker']] = (parse_rule(r['yellow']), parse_rule(r['red']))

def status(b, v):
    y, red = rules.get(b, (None, None))
    if red and hit(red, v): return 'urgent'
    if y: return 'normal' if hit(y, v) else 'potential'
    return 'normal'

with open(data_path, 'rb') as f:
    has_bom = f.read(3) == b'\xef\xbb\xbf'
with open(data_path, encoding='utf-8-sig', newline='') as f:
    text = f.read()
newline = '\r\n' if '\r\n' in text else '\n'
rows = list(csv.reader(text.splitlines()))
head, body = rows[0], rows[1:]
iB, iF = head.index('biomarker'), head.index('figure')

idx = defaultdict(list)  # biomarker -> row indices in file order
for i, r in enumerate(body):
    if len(r) > iF and r[iF].strip():
        idx[r[iB]].append(i)

changed, before = Counter(), Counter()
for b, ids in idx.items():
    st = {i: status(b, float(body[i][iF])) for i in ids}
    for s in st.values(): before[(b, s)] += 1
    if b in SKIP:
        continue
    normals = [i for i in ids if st[i] == 'normal']
    if not normals:
        continue
    med = statistics.median(float(body[i][iF]) for i in normals)
    for k, i in enumerate(ids):
        if st[i] != 'urgent':
            continue
        prev = next((j for j in reversed(ids[:k]) if st[j] == 'normal'), None)
        nxt = next((j for j in ids[k + 1:] if st[j] == 'normal'), None)
        src = prev if prev is not None else nxt
        new = body[src][iF] if src is not None else f'{med:g}'
        assert status(b, float(new)) == 'normal', (b, new)
        body[i][iF] = new
        changed[b] += 1

print('urgent readings before (excluding SBP):', sum(c for (b, s), c in before.items() if s == 'urgent' and b not in SKIP))
for b, c in sorted(changed.items()):
    print(f'  {b}: {c} urgent -> normal')
print('potential readings kept:', sum(c for (b, s), c in before.items() if s == 'potential'))
print('SBP urgent kept:', before[('Blood Pressure (SBP)', 'urgent')])

if write:
    with open(data_path, 'w', encoding='utf-8-sig' if has_bom else 'utf-8', newline='') as f:
        w = csv.writer(f, lineterminator=newline)
        w.writerow(head); w.writerows(body)
    print('written:', data_path)
