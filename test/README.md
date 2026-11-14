# KOOK test bench

Replays one crew's day through the same data flow as the dashboard:

| Card | What it shows |
| --- | --- |
| **Raw** | Device readings as CSV rows, one 5-minute slot at a time |
| **Astronaut dashboard** | Each slot zstd-compressed into one file, whatever its status, shown right away. Shows the total size and its share of raw |
| **Doctor dashboard** | The same files, each arriving 20 minutes after it was measured. Shows what has arrived and how many are in transit |

At the top, pick the crew (A–D), the day (Nov 1–30) and the playback speed. The crew photo, date and current replay time are shown above the cards.

Serve the repository root so the page can read `../data`:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/test/.

## How it works

- Readings come from `data/crew/{A,B,C,D}_raw.csv`.
- Colours follow `data/biomarker/biomarker.csv`: yellow column = normal range, red = urgent, otherwise potential. Status only colours the rows; it does not change how a reading is sent.
- zstd (level 19) runs in the browser via WebAssembly ([`@bokuweb/zstd-wasm`](https://www.npmjs.com/package/@bokuweb/zstd-wasm)). Every file is decompressed again and compared with its rows.
- See the root README, "Data flow", for the numbers and the design history.
