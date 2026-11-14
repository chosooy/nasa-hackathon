# KOOK test bench

One page that joins the **ear-worn device simulator** and the **Mars → Earth compression simulator**
(both from [minuncho/prep](https://github.com/minuncho/prep): `simulator/` and `space-sim/`), running on this repo's data.

- Open the Mars window: `test/index.html`
- Open the Earth window: `test/index.html?side=earth` (same browser; it receives what Mars sends)
- Shorter link delay for testing: `test/index.html?delay=0.5` (minutes, Mars window; default 20)

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
   - Files reach the Earth window after the one-way delay.

The simulator expects `Normal / Warning / Critical`, so Potential is passed as `Warning` and Urgent as `Critical`.
