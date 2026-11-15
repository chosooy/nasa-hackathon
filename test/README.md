# KOOK test bench

Replays one crew's day through the same data flow as the dashboard:

| Card | What it shows |
| --- | --- |
| **Raw** | Device readings as CSV rows, one 5-minute slot at a time |
| **Astronaut dashboard** | Every reading right away, kept in a buffer. The buffer is zstd-compressed into one file and sent when a biomarker newly turns Potential or Urgent, or when it is 6 hours old. Shows the files sent, their size and what is still in the buffer |
| **Doctor dashboard** | Each file arrives 20 minutes after it was sent. Shows what has arrived and how many are in transit |

At the top, pick the crew (A–D), the day (Nov 1–30) and the playback speed. The crew photo, date and current replay time are shown above the cards.

**Voice guidance.** When a biomarker newly turns Potential or Urgent, the page reads the first sentence of its instruction from `data/health_instruction/health_instruction.csv` aloud (`yellow_instruction` for Potential, `red_instruction` for Urgent). The same sentence is shown under the time.

- It uses the browser's built-in speech (Web Speech API).
- Playback pauses while it speaks, so every announcement is heard in full.
- Clicking **Start** allows the browser to play sound.
- The **Voice** checkbox turns it off.
- Speeds are 1× (one 5-minute slot per second) and 4×.

Serve the repository root so the page can read `../data`:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/test/.

## How it works

- Readings come from `data/crew/{A,B,C,D}_raw.csv`.
- Colours follow `data/biomarker/biomarker.csv`: yellow column = normal range, red = urgent, otherwise potential. Status also decides when the buffer is sent: a biomarker that newly turns Potential or Urgent sends it.
- zstd (level 19) runs in the browser via WebAssembly ([`@bokuweb/zstd-wasm`](https://www.npmjs.com/package/@bokuweb/zstd-wasm)). Every file is decompressed again and compared with its rows.
- See the [development document](../docs/DEVELOPMENT.md#data-flow) for the numbers and the design history.
