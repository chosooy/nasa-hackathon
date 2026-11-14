# KOOK Dashboard

Static web dashboard built from the Figma **최종** section (astronaut + ground doctor screens).
Crew A, November 2026 (DAY 032–061), "today" = 2026-11-14 (DAY 045).

## Run locally

Serve the **repository root** (the page reads `../data` and `../assets`):

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/dashboard/

On GitHub Pages (deploy from `main` / root) it lives at `https://<user>.github.io/nasa-hackathon/dashboard/`.

## Screens

| Astronaut (`#/crew`) | Ground doctor (`#/doctor`) |
| --- | --- |
| Home: week calendar, Health Instruction, hazard board, chat | Home: instruction library, crew hazard board, biomarker carousel |
| Day view `#/crew/day/2026-11-14` | Crew page `#/doctor/crew/A` (calendar, tiles, biomarker grid) |
| Health Instruction / What needs your attention | Crew health instructions (library + send instruction) |
| Biomarker detail `#/crew/bio/HbA1c` | Biomarker detail `#/doctor/bio/HbA1c` |
| Conversation, Profile | Conversation, Profile |
| Floating **Ground Doctor** button on every screen | Floating **Crew conversation** button on every screen |

## Data

- `data/calendar/events.csv` → calendars (event hazard `hostile` is shown as **Habitat**)
- `data/crew/A_hotdata_hazard_mix.csv` → Crew A readings used by the dashboard (status = latest reading up to the dashboard clock). Derived from `A_hotdata_all_SBP_urgent.csv` so the hazard board shows Distance = Urgent (RBC/HPF ≥3), Gravity = Potential (SBP 140–145), Radiation / Isolation / Habitat = Normal
- `data/biomarker/biomarker.csv` → `yellow` column = **Potential** boundary (neon yellow): outside it → Potential; `red` column = **Urgent** condition (red): matching it → Urgent; otherwise Normal
- `data/health_instruction/health_instruction.csv` → summaries, hazards, yellow/red instructions, library
- `data/biomarker/raw biomarker.csv` → detail page "Earth vs space" (`earth_space_comparison`) and "Measure period" (`Numeric_criteria_or_limitation`, `Recommended_timing`)
- `assets/image/A_profile.png` → Crew A face in all profile spots

Chat messages, doctor instructions and library additions are stored in the browser's `localStorage`
(shared between the two roles in the same browser, for the demo).
