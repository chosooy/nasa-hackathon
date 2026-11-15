[← Back to README](../README.md)

# KOOK data

The biology behind KOOK: which biomarkers we watch, how each one is judged Normal, Potential or Urgent, and what the crew should do about it.

## From research to dashboard

```
NASA research ──▶ raw biomarker.csv ──▶ health_instruction.csv ──▶ biomarker.csv ──▶ dashboard
                  85 biomarkers,         85 biomarkers,              32 "clear" ones,
                  every column           summary + instructions      thresholds for graphs
```

| Term | Meaning | Count |
| --- | --- | ---: |
| **Clear** biomarker | Has numbers that clearly divide Normal / Potential / Urgent | 32 |
| **Unclear** biomarker | Ambiguous to divide into states; guidance only | 53 |

## Files

| File | Rows | What it holds | Used for |
| --- | ---: | --- | --- |
| [`biomarker/raw biomarker.csv`](biomarker/raw%20biomarker.csv) | 85 | Every column from the research: hazards, criteria, timing, Earth–space comparison | Biomarker detail page (Measure period, Earth vs space) |
| [`health_instruction/health_instruction.csv`](health_instruction/health_instruction.csv) | 85 | Clear + unclear biomarkers with summary, hazards and instructions | Health instruction page |
| [`biomarker/biomarker.csv`](biomarker/biomarker.csv) | 32 | Clear biomarkers with `yellow` / `red` thresholds | Status colours and graphs |
| [`crew/{A,B,C,D}_raw.csv`](crew/) | 35,062 each | Dummy readings for Nov 1–30, 2026 | Every crew screen |
| [`calendar/events.csv`](calendar/events.csv) | 7,557 | Dummy crew schedule for 2026, each event tagged with hazards | Calendars |

## The 32 clear biomarkers

| Category | Biomarkers | Method · how often |
| --- | --- | --- |
| Cardiovascular | Heart Rate, Blood Pressure (SBP, DBP) | device · continuous |
| Body temperature | Body temperature | ingestible thermometer pill · continuous |
| Sleep | Total Sleep Time, Sleep Efficiency, Sleep Latency, Wake After Sleep Onset, Sleep Onset/Offset | device · daily |
| Sleep questionnaires | Self-reported sleep quality / duration, Mood, Team cohesion, Habitability | computer questionnaire · daily |
| Blood | WBC, Hb, Platelets, HbA1c, LDL-cholesterol, ApoB, MDA | blood sample · daily to every 3 months |
| Kidney / urine | UACR, Blood Urea Nitrogen, RBC/HPF | blood or urine sample · daily |
| Cognition | Motor Praxis, Visual Object Learning, Fractal 2-Back, Abstract Matching, Line Orientation, Emotion Recognition, Matrix Reasoning, Digit Symbol Substitution | computer test · 1–2 times a year |

## Three states

| State | Colour | Column | Example: Blood Pressure (SBP) |
| --- | --- | --- | --- |
| **Normal** | Blue | `yellow` = normal range | `<120 mmHg` |
| **Potential** | Yellow | outside `yellow` | 120–179 mmHg → `yellow_instruction` |
| **Urgent** | Red | `red` | `>=180 mmHg` → `red_instruction` |

Cognition tests use `< B-2SD`: more than 2 standard deviations below the astronaut's own baseline measured on Earth.

## Five hazards

Each biomarker is tagged with the NASA space hazards it reflects. A hazard on the board turns Potential or Urgent when one of its biomarkers does.

| Hazard | Clear biomarkers tagged | All 85 tagged |
| --- | ---: | ---: |
| Isolation | 21 | 42 |
| Habitat (hostile environment) | 16 | 39 |
| Gravity | 15 | 45 |
| Distance from Earth | 13 | 35 |
| Radiation | 4 | 17 |

## References

| Used for | Source |
| --- | --- |
| Hazards: sorting biomarkers into 5 criteria | [NASA Human Research Program: Hazards](https://www.nasa.gov/hrp/hazards/) |
| Measurement methods | [NASA Spaceflight Standard Measures](https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space/) |
| How space affects human physiology | [NASA OSDR biological data](https://osdr.nasa.gov/bio/repo/search?q=&data_source=cgene,alsda,esa&data_type=study) |
| Crew schedule (dummy events) | [NASA Space Station blog](https://www.nasa.gov/blogs/spacestation/) |
