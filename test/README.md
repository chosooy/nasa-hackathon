# KOOK test bench

Replays one crew's day and shows what each transmission lane carries, side by side:

| Card | What it holds | How it is sent |
| --- | --- | --- |
| **RAW** | Every reading as CSV | Not sent as is; this is the baseline for the other two |
| **HOT** | Potential / Urgent readings | Gathered every second, each file zstd-compressed |
| **COLD** | Normal readings, summarised per biomarker (count, min, max, mean) | Compressed with CCSDS 121, sent hourly |

Each card shows its size so far. HOT and COLD also show what share of their own raw rows they take on the wire.

At the top, pick the crew (A–D), the day (Nov 1–30) and the playback speed. Each tick plays one 5-minute slot.

Serve the repository root so the page can read `../data`:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/test/.

## How it works

- Readings come from `data/crew/{A,B,C,D}_hotdata.csv`. Status follows `data/biomarker/biomarker.csv`: yellow = normal range, red = urgent, otherwise potential.
- The lanes run in the Rust/WebAssembly simulator in `pkg/`, copied from [minuncho/prep](https://github.com/minuncho/prep) `space-sim/web/pkg`. The page feeds it one row at a time. Its *priority* lane is our HOT lane.
- The simulator expects `Normal / Warning / Critical`, so Potential is passed as `Warning` and Urgent as `Critical`.
- In fast playback several anomalies share a second, so HOT files look efficient. In real time readings are 5 minutes apart and each HOT file holds about one row. See the root README, "Size experiments".
