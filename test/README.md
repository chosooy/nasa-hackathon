# KOOK test bench

One page that joins the **ear-worn device simulator** and the **Mars → Earth compression simulator**
(both from [minuncho/prep](https://github.com/minuncho/prep): `simulator/` and `space-sim/`), running on this repo's data.

- Open: `test/index.html` (Mars side only; the transmission log shows each file's Earth arrival time)
- Shorter link delay for testing: `test/index.html?delay=0.5` (minutes; default 20)

Serve the repository root so the page can read `../data`:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/test/.

## What happens

1. **Device.** Replays one crew's day from `data/crew/{A,B,C,D}_hotdata.csv`, one 5-minute slot per tick. Each reading lights the part it comes from:
   - PPG: heart rate, blood pressure
   - IMU: sleep measures
   - Wireless: everything else
2. **Voice guidance.** When a biomarker turns Potential or Urgent, the device reads out the first sentence of its instruction from `data/health_instruction/health_instruction.csv`. Status follows `data/biomarker/biomarker.csv` (yellow = normal range, red = urgent).
3. **Compression and link.** The same rows go into the Rust/WebAssembly simulator in `pkg/`, copied from `minuncho/prep/space-sim/web/pkg`:
   - **hot:** the raw stream, zstd
   - **cold:** a per-biomarker summary compressed with CCSDS 121, sent hourly
   - **priority:** Potential/Urgent rows, zstd, sent every second
   - The size table shows two things. The first is what each stream would be if compressed in one go, as a reference. The second is the files actually sent so far. In fast replay several anomalies share a second; in real time each priority file holds about one row (see the root README, "Size experiments").

The simulator expects `Normal / Warning / Critical`, so Potential is passed as `Warning` and Urgent as `Critical`.
