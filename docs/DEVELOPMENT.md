<!-- KOOK development document: how the dashboard works, how data moves from Space to Earth, and why it is built this way. Linked from the README and the dashboard's "How it works". -->
[← Back to README](../README.md)

## KOOK development document

**Contents**

- [Architecture](#architecture)
- [Status rules](#status-rules)
- [Data flow](#data-flow)
- [The trade-off](#the-trade-off)
- [Packed file format](#packed-file-format)
- [Design history](#design-history)
- [Test bench and tools](#test-bench-and-tools)

### Architecture

```
data/*.csv ──fetch──▶ dashboard/app.js ──▶ crew view (#/crew, Space)
                         │                    every reading right away
                         │
                         └─ sendSchedule ──▶ doctor view (#/doctor, Earth)
                            buffer → zstd       only files that have arrived (+20 min)
```

| External library (CDN) | Used for |
| --- | --- |
| [`@bokuweb/zstd-wasm`](https://www.npmjs.com/package/@bokuweb/zstd-wasm) 0.0.22 | Zstandard compression in the browser (WebAssembly) |
| Space Grotesk, Pretendard | Fonts |

### Status rules

| Status | Rule (`biomarker.csv`) | Instruction shown |
| --- | --- | --- |
| **Urgent** | Matches the `red` column | `red_instruction` |
| **Potential** | Otherwise, matches the `yellow` column | `yellow_instruction` |
| **Normal** | Otherwise | — |

| What | How | Code |
| --- | --- | --- |
| Biomarker status | Its latest reading at the dashboard clock | `valueAt` |
| Hazard board (Radiation, Isolation, Distance, Gravity, Habitat) | Worst status among the biomarkers tagged with that hazard | `hazardStatus` |

### Data flow

![KOOK data flow: raw readings → astronaut dashboard (buffer) → zstd, 20 min → doctor dashboard](../assets/diagram/data_flow.png)

| Stage | Where | What happens | When |
| --- | --- | --- | --- |
| **Raw** | Ear-worn device | CSV rows (`date,time,biomarker,figure`), every 5 minutes | As measured |
| **Astronaut dashboard** | Space | Shows every reading and keeps it in a buffer | Right away |
| **Doctor dashboard** | Earth | Receives the buffer as one zstd file | 20 min after it is sent |

| The buffer is sent when… (whichever comes first) | Result |
| --- | --- |
| A biomarker **newly** turns Potential or Urgent | A new problem reaches the doctor in 20 min |
| The buffer is **6 hours** old | Normal data never waits longer than 6 h |

| Detail | Value |
| --- | --- |
| File name | `A_2026-11-14T1300.zst` = Crew A, sent 13:00 UTC, Nov 14 |
| Check | Every file is decompressed again and must match (`✓ verified`) |
| Chat | Same 20-min delay: *In transit* → *Delivered* |
| Code | [`dashboard/app.js`](../dashboard/app.js) (`sendSchedule`, `transmissionLog`, `earthCrew`), [`test/app.js`](../test/app.js) |

**Size for one day** (2026-11-13, 1,168 readings per crew):

| Crew | Raw CSV | Files sent | Sent (columns + zstd) |
| --- | ---: | ---: | ---: |
| A | 45.5 KB | 17 | 1.8 KB (4.1%) |
| B | 45.5 KB | 5 | 1.7 KB (3.6%) |
| C | 45.5 KB | 5 | 1.6 KB (3.6%) |
| D | 45.5 KB | 4 | 1.6 KB (3.6%) |

### The trade-off

| How often Space sends | Size vs raw | When the doctor sees it |
| --- | ---: | --- |
| Every 5-minute slot | ~64% | Always 20 min after measurement |
| **New Potential/Urgent, or every 6 h (current)** | **3.6–4.1%** | New problems after 20 min, Normal data within 6 h |
| A whole day in one file | 7.8–8.6% | Up to a day later |

### Packed file format

```
varint  day        days since 2026-01-01 of the file's first reading
varint  groups     number of biomarkers in the file
per biomarker:
  varint  id         row number in biomarker.csv
  byte    decimals   e.g. 1 → 142.1 is stored as 1421
  varint  count
  count × (varint Δminutes, varint zigzag(Δvalue))
                              ↓
                        zstd level 19
```

| Packing (Crew A–D, Nov 13) | Size vs raw |
| --- | ---: |
| CSV rows + zstd | 9.8–12.1% |
| **Columns + deltas + zstd (current)** | **3.6–4.1%** |

### Design history

| Step | Design | Size vs raw (Crew A) | Why it changed |
| --- | --- | ---: | --- |
| 1 | Hot/cold lanes: Potential/Urgent every minute, Normal hourly in CCSDS packets | 64% | Tiny one-row bundles grew under zstd |
| 2 | One zstd file per 5-minute slot | 64% | Each file held only ~4 readings |
| 3 | Buffer, sent on a new Potential/Urgent or every 6 h | 12.1% | — |
| **4** | **Step 3 + columns + deltas packing (current)** | **4.1%** | — |

### Test bench and tools

| | What it is |
| --- | --- |
| [Test bench](../test/) | Replays one crew's day as Raw → Astronaut dashboard → Doctor dashboard ([`test/README.md`](../test/README.md)) |
| [Tools](../tools/) | Python scripts that generated Crews B–D and measured the sizes above ([`tools/README.md`](../tools/README.md)) |
