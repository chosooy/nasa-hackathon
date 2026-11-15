# Tools

Python scripts we used to build the demo data and to measure the Mars–Earth data flow. None of them run in the dashboard; they produced the data in `data/crew/` and the numbers in [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md).

The measuring scripts need `zstandard` (`pip install zstandard`); the data scripts use only the standard library.

## Demo data

| Script | What it does |
| --- | --- |
| [`hazard_mix.py`](hazard_mix.py) | Tunes Crew A's readings so the hazard board shows one Urgent hazard (Distance), one Potential (Gravity) and three Normal, at every moment of the month |
| [`normalize_urgent.py`](normalize_urgent.py) | Turns Urgent readings back into Normal ones (except blood pressure), using the nearest earlier Normal reading. Dry run by default; `--write` saves |
| [`make_crews.py`](make_crews.py) | Generates Crews B, C and D from Crew A's month, each with its own baseline, noise and target pattern (B: LDL/ApoB Potential, C: sleep Potential, D: all clear) |

## Measurements

| Script | What it measures |
| --- | --- |
| [`compare_sizes.py`](compare_sizes.py) | One day sent four ways: raw CSV, all zstd, all CCSDS packets, and the earlier hot/cold split |
| [`hot_bundle_options.py`](hot_bundle_options.py) | Why tiny hot bundles grew under zstd, and what shrinks them (no header, no compression, shared dictionary) |
| [`train_dictionary.py`](train_dictionary.py) | Trains a shared zstd dictionary on Nov 1–12 and tests it on Nov 13 (used for a while, then replaced) |
| [`compression_options.py`](compression_options.py) | The current send rule with eight ways to pack each file. Columns + deltas + zstd won, at about 4% of raw |

All status rules match the dashboard: `data/biomarker/biomarker.csv` yellow column = normal range, red = Urgent, anything else = Potential.
