
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

![KOOK data flow: raw readings → astronaut dashboard (buffer) → zstd, 20 min → doctor dashboard](assets/diagram/data_flow.png)

Crew health data goes through three stages:

| Stage | Where | What happens | When |
| --- | --- | --- | --- |
| **Raw** | Ear-worn device | Readings as CSV rows (`date,time,biomarker,figure`), every 5 minutes | As measured |
| **Astronaut dashboard** | Mars | Shows every reading right away and keeps it in a buffer | Right away |
| **Doctor dashboard** | Earth | Receives the buffer as one zstd file | 20 minutes after it is sent (one-way light time) |

**When the buffer is sent.** Whichever of these comes first:

- **A biomarker newly turns Potential or Urgent.** Its status changes into Potential or Urgent, or from Potential to Urgent. A biomarker that stays Potential does not trigger again, so a crew whose blood pressure is Potential all day doesn't send every 5 minutes.
- **The buffer is 6 hours old.** Normal data never waits longer than 6 hours.

That means a new problem reaches the doctor 20 minutes after it is measured, and everything else arrives in larger files that compress much better.

- **zstd.** Real Zstandard compression (level 19) runs in the browser via WebAssembly ([`@bokuweb/zstd-wasm`](https://www.npmjs.com/package/@bokuweb/zstd-wasm)), called from JavaScript.
  - A file holds only the rows, with no CSV header; both sides know the columns.
  - Each file is decompressed again and compared with the original rows (`✓ verified`).
- **File names.** `A_2026-11-14T1300.zst` is Crew A's buffer, sent at 13:00 UTC on Nov 14.
- **Doctor dashboard.** It uses only readings whose file has arrived, and its top bar shows the last arrival (`Received HH:MM UTC`). The astronaut's and the doctor's latest values can differ by up to 6 hours for Normal data.
- **Chat** has the same 20-minute delay. The sender sees *In transit*, then *Delivered*; the other side sees a message only on arrival.
- **Where to see it**
  - The astronaut's **Conversation** page shows the files sent today, with the trigger (new Potential/Urgent or 6-hour send), readings, raw → zstd size, check, and doctor arrival. It also shows what is waiting in the buffer.
  - The [test bench](test/) replays a whole day as **Raw | Astronaut dashboard | Doctor dashboard**.
- **Code:** [`dashboard/app.js`](dashboard/app.js) (`sendSchedule`, `transmissionLog`, `earthCrew`) and [`test/app.js`](test/app.js).
- **Data:** `data/crew/{A,B,C,D}_raw.csv`.

**Size for one day** (2026-11-13, 1,168 readings per crew, buffer starting empty at 00:00):

| Crew | Raw | Files sent | zstd total | Longest wait for Normal data |
| --- | ---: | ---: | ---: | ---: |
| A (blood pressure turns Potential often) | 45.5 KB | 17 | 5.5 KB (12.1%) | 6 h |
| B | 45.5 KB | 5 | 4.6 KB (10.1%) | 6 h |
| C | 45.5 KB | 5 | 4.5 KB (9.8%) | 6 h |
| D (all Normal) | 45.5 KB | 4 | 4.5 KB (9.8%) | 6 h |

For comparison, sending every 5-minute slot as its own file kept the doctor exactly 20 minutes behind on everything, but came to about 64% of raw (see Design history).

### The trade-off

This flow does **not** give the smallest possible size. zstd shrinks data better the more it gets at once, because repeated dates and biomarker names are stored only once. So the longer Mars waits, the smaller the data, and the later the doctor sees it:

| How often Mars sends (Nov 13, ~45.5 KB raw per crew) | Size vs raw | When the doctor sees it |
| --- | ---: | --- |
| Every 5-minute slot | ~64% | Always 20 min after measurement |
| **New Potential/Urgent, or every 6 h (current)** | 9.8–12.1% | New problems after 20 min; Normal data within 6 h |
| A whole day in one file | 7.8–8.6% | Up to a day later |

We chose the middle row on purpose. It costs only 2–4 percentage points more than sending once a day, and in return a new problem reaches the doctor in 20 minutes instead of the next day.

### Shrinking further under the same rule

Same send rule, same files, packed differently. Every option is decoded again and must give back the same readings. Measured on 2026-11-13 by [`tools/compression_options.py`](tools/compression_options.py) (dictionaries trained on Nov 1–12 files made by the same rule):

| Option | A | B | C | D |
| --- | ---: | ---: | ---: | ---: |
| a) CSV rows, zstd 19 (**current**) | 12.1% | 10.1% | 9.8% | 9.8% |
| b) CSV rows, zstd 22 (highest level) | 12.1% | 10.1% | 9.8% | 9.8% |
| c) CSV rows, zstd + shared dictionary | 9.5% | 9.2% | 8.9% | 9.1% |
| d) compact text, zstd | 8.5% | 7.9% | 7.6% | 7.7% |
| e) compact text, zstd + dictionary | 7.7% | 7.6% | 7.3% | 7.6% |
| **f) columns + deltas, zstd** | **4.1%** | **3.6%** | **3.6%** | **3.6%** |
| g) columns + deltas, no zstd | 5.7% | 5.5% | 5.5% | 5.4% |
| h) columns + deltas, zstd + dictionary | 3.6% | 3.3% | 3.2% | 3.2% |

What the options mean:

- **compact text:** the date is written once per file, time as `HHMM`, and the biomarker as a number from a list both sides already hold, e.g. `1305,4,142.1`.
- **columns + deltas:** readings are grouped by biomarker. For each one we store the slot number and the value as whole numbers, with decimals fixed per biomarker, e.g. 142.1 → 1421. Each number is stored as the change from the previous one, in a variable number of bytes. Readings that barely change become runs of tiny numbers, which zstd squeezes very well.

What we learned:

- Raising zstd from level 19 to 22 changes nothing on files this small.
- A shared dictionary helps plain CSV (~2 points) but adds little once the format is already compact (f → h: ~0.4 points), and both sides must keep the same dictionary file.
- **The format matters more than the compressor.** Option f takes a day to 3.6–4.1% of raw. That is about a third of the current size, and smaller than a whole day of CSV in one file (7.8%), while keeping the same 20-minute alerts.
- The values come back exactly, but number formatting does not: `142.0` comes back as `142`.

**Not applied yet.** The dashboard and test bench still send option a (CSV rows + zstd). Option f is the recommended next step.

## Design history

**Step 2, one zstd file per 5-minute slot.** Every slot, whatever its status, went to the doctor 20 minutes after it was measured. It was simple, but each file held only about four readings, so a day came to ~29 KB (64% of raw). We also considered sending on any Potential/Urgent reading, else once a day: that cut Crews B–D to ~9%, but Crew A's blood pressure is Potential all day, so it still sent every 5 minutes (64%). Counting only *new* Potential/Urgent readings and adding the 6-hour cap gave the current flow.

**Step 1, hot/cold lanes.** Before that, we split readings into two lanes by status:

- **hot:** Potential/Urgent readings, sent every minute
- **cold:** Normal readings, batched hourly and packed into CCSDS Space Packets

We later added a shared zstd dictionary for the hot lane. That design was replaced by step 2. These are the measurements we made along the way.

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

In the end we dropped the hot/cold split, CCSDS packets and the dictionary for plain zstd: first one file per 5-minute slot (step 2), then the buffered flow in [Data flow](#data-flow).

**Test bench:** [`test/`](test/) replays a day as Raw | Astronaut dashboard | Doctor dashboard. See [`test/README.md`](test/README.md).
