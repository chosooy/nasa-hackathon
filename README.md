
<p align="center">
  <img src="assets/logo/banner.png" width="100%" alt="KOCK Banner">
</p>



[구글 슬라이드](https://docs.google.com/presentation/d/1-_GjA7EkPju9ftL7wJygjFODrgVq4lCvm-AXgDYFebA/edit?slide=id.p#slide=id.p)
- [ ] Project Summary(50-200 단어)
- [ ] Project Links(ppt, 깃허브)
- [ ] Project Details 
- [ ] Use of AI 
- [ ] Nasa Data + Other Data Resources 밝히기


## Data flow

![KOOK data flow: raw readings → zstd → astronaut dashboard → 20 min → doctor dashboard](assets/diagram/data_flow.png)

Crew health data goes through three stages:

| Stage | Where | What it holds | When |
| --- | --- | --- | --- |
| **Raw** | Ear-worn device | Every reading as CSV rows (`date,time,biomarker,figure`), one 5-minute slot at a time | As measured |
| **Astronaut dashboard** | Mars | Each slot zstd-compressed into one file, whatever the readings' status | Right away |
| **Doctor dashboard** | Earth | The same files | 20 minutes later (one-way light time) |

- **zstd.** Real Zstandard compression (level 19) runs in the browser via WebAssembly ([`@bokuweb/zstd-wasm`](https://www.npmjs.com/package/@bokuweb/zstd-wasm)), called from JavaScript.
  - A file holds only the rows, with no CSV header; both dashboards know the columns.
  - Each file is decompressed again and compared with the original rows. The log shows `✓ verified` when they match.
- **File names.** `A_2026-11-14T1335.zst` means Crew A's readings measured at 13:35 UTC on Nov 14.
- **Doctor dashboard.** It uses only readings that have arrived, so each reading appears exactly 20 minutes after it was measured.
  - At the same moment the astronaut's and the doctor's latest values can differ.
  - The doctor's top bar shows the last arrival (`Received HH:MM UTC`).
- **Chat** has the same 20-minute delay. The sender sees a message right away as *In transit*, which turns into *Delivered* when it arrives. The other side sees it only on arrival.
- **Where to see it**
  - The astronaut's **Conversation** page shows the file log: name, readings, raw → zstd size, check, measured time, doctor arrival time.
  - The [test bench](test/) replays a whole day as **Raw | Astronaut dashboard | Doctor dashboard**.
- **Code:** [`dashboard/app.js`](dashboard/app.js) (`transmissionLog`, `arrivalMs`, `earthCrew`) and [`test/app.js`](test/app.js).
- **Data:** `data/crew/{A,B,C,D}_raw.csv`.

**Size for one day** (2026-11-13, 288 slots, 1,168 readings per crew):

| Crew | Raw | zstd, one file per slot | (reference) whole day in one file |
| --- | ---: | ---: | ---: |
| A | 45.5 KB | 29.1 KB (64.0%) | 3.6 KB (7.8%) |
| B | 45.5 KB | 29.0 KB (63.8%) | 3.9 KB (8.6%) |
| C | 45.5 KB | 29.1 KB (64.0%) | 3.8 KB (8.3%) |
| D | 45.5 KB | 29.1 KB (63.8%) | 3.9 KB (8.5%) |

A 5-minute slot holds about four readings (~160 B), which zstd brings to ~100 B. A whole day in one file would be far smaller, but the doctor would then wait until the day ends. Sending every slot keeps the doctor exactly 20 minutes behind.

## Design history

Before the flow above, we split readings into two lanes by status:

- **hot:** Potential/Urgent readings, sent every minute
- **cold:** Normal readings, batched hourly and packed into CCSDS Space Packets

We later added a shared zstd dictionary for the hot lane. That design was replaced by the single zstd flow above. These are the measurements we made along the way.

### Size experiments (hot/cold design)

All numbers are for one 24-hour day (2026-11-13) of crew data, measured with real zstd (level 19). Status rules come from `data/biomarker/biomarker.csv`. The scripts live outside the repo; the method is described here so the numbers can be redone.

**1. Four ways to send the same day (Crew A: 1,168 readings, 322 of them Potential/Urgent)**

| Method | Size | vs raw |
| --- | ---: | ---: |
| 1. Raw CSV | 45.6 KB | 100% |
| 2. Whole day, zstd | **3.5 KB** | **7.7%** |
| 3. Whole day, CCSDS packets (no compression, 46 packets) | 46.2 KB | 101.4% |
| 4. Split, as the dashboard does | 29.3 KB | 64.2% |
| └ hot: Potential/Urgent, 1-minute zstd bundles (288) | 22.9 KB | 50.2% |
| └ cold: Normal, hourly zstd + CCSDS (24 batches) | 6.4 KB | 14.1% |
| (reference) whole day, zstd + CCSDS | 3.6 KB | 7.9% |

Crews B, C and D have almost no Potential/Urgent readings. For them method 4 comes to 7.7–8.0 KB (about 17%), against 3.7–4.0 KB for method 2.

- **CCSDS is packaging, not compression.** Each packet adds 14 bytes (6 B primary header, 6 B time, 2 B CRC), so the size grows by about 1.4%.
- **Compressing a whole day at once is the smallest**, because dates, biomarker names and the CSV header repeat thousands of times and zstd stores each only once.
- **Splitting costs bytes but buys time.** An Urgent reading reaches the doctor in about 21 minutes instead of after the day ends.

**2. Why the hot lane is so big: 22.9 KB from 21.4 KB of raw rows**

A 1-minute hot bundle almost always holds a single reading, because readings come every 5 minutes. Each bundle contains:

| Part | Size |
| --- | ---: |
| CSV header `date,time,biomarker,figure` | 27 B |
| One row, e.g. `2026-11-13,12:05,Blood Pressure (SBP),142.1` | ~45 B |
| zstd frame overhead added to every bundle | ~9–13 B |

A single row gives zstd nothing earlier to refer back to, so the ~72 B bundle grows to ~80 B. Crew A's SBP is Potential all day, so there are 288 such bundles.

**3. A mistake we made with the test bench, and the correction**

The test bench's size table first showed "priority: 1.5% of raw". That looked like proof that sending anomalies every second compresses far better than 1-minute bundles. It doesn't. The figure came from compressing *all* anomaly rows so far in one go.

The files the simulator actually sent (`A_priority.bin`) were 127–155 B each, larger than the rows inside them. Sending every second only helps when several anomalies pile up within that second. That happens in the fast replay, but not in real time, where readings are 5 minutes apart. After that the test bench showed both: "If compressed in one go (reference)" and "Files actually sent so far".

**4. What actually shrinks small bundles** (Crew A, 288 hot bundles, raw with header 21.9 KB)

| Option | Total | vs raw | Per bundle |
| --- | ---: | ---: | ---: |
| a) header + rows, zstd (what the hot lane first did) | 23.4 KB | 107% | 81 B |
| b) rows only, no compression | 14.1 KB | 64% | 49 B |
| c) rows only, zstd | 15.8 KB | 72% | 55 B |
| d) rows only, zstd with a shared dictionary | 9.4 KB | 43% | 33 B |
| d2) same, with zstd frame header fields trimmed | 8.2 KB | 38% | 29 B |
| (whole day of hot rows at once, for reference) | 0.7 KB | 3% | 2 B |

For d, the 2 KB dictionary was trained on Nov 1–12 readings. Both Mars and Earth would hold it before the mission.

A shared dictionary gives zstd the repeated parts (dates, biomarker names, number formats) before the first bundle, so even a one-row bundle compresses. It keeps the 21-minute delivery and cuts the hot lane by almost two-thirds.

**Then replaced.** We used option d for a while: a 2 KB dictionary trained on Nov 1–12 data cut Crew A's 288 hot bundles from 15.8 KB to 9.6 KB.

In the end we dropped the hot/cold split, CCSDS packets and the dictionary for the simpler flow in [Data flow](#data-flow). Every 5-minute slot goes out as one plain zstd file, and the doctor sees it 20 minutes later.

**Test bench:** [`test/`](test/) replays a day as Raw | Astronaut dashboard | Doctor dashboard. See [`test/README.md`](test/README.md).
