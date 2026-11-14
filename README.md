<p align="center">
  <img src="assets/logo/banner.png" width="100%" alt="KOOK banner">
</p>

# KOOK — Kinetic Observation & Optimal Keel

**A health monitoring dashboard that helps astronauts manage their own health on long-duration space missions.**

[Live dashboard](https://chosooy.github.io/nasa-hackathon/dashboard/) · [Test bench](https://chosooy.github.io/nasa-hackathon/test/) · [Slides](https://docs.google.com/presentation/d/1-_GjA7EkPju9ftL7wJygjFODrgVq4lCvm-AXgDYFebA/edit?slide=id.p#slide=id.p) · [Data flow](docs/data-flow.md)

## Summary

KOOK (Kinetic Observation & Optimal Keel) is a health monitoring dashboard designed to help astronauts manage their health on their own during long-duration space missions.

On long missions, astronauts are exposed to the five major health hazards identified by NASA. These risks vary in severity, so astronauts need a system that lets them assess their health immediately and gives them step-by-step guidance.

KOOK aims to lower the barriers to health management in space with an intuitive, accessible dashboard that anyone can understand and use.

## How it works

KOOK supports efficient health assessments by comparing **baseline health data collected on Earth** with **health data that keeps accumulating in space**.

**Step 1 — Immediate response**

- KOOK sorts each biomarker into one of three severity levels: **Urgent**, **Potential** or **Normal**.
- Astronauts can open the **Health Instruction Library**, where medical professionals have uploaded health guidelines.
- A **linked audio device** reads the instructions aloud, so astronauts can follow the recommended steps without relying only on the screen.

**Step 2 — In-depth consultation**

- When more medical support is needed, astronauts can talk directly with medical professionals on Earth in **one-on-one chat consultations**.

**Getting the data to Earth**

- The astronaut dashboard on Mars shows every reading right away.
- Readings go to the doctor's dashboard on Earth as small compressed files. A new Potential or Urgent reading is sent at once, and everything else at least every 6 hours.
- Each file arrives 20 minutes later, the one-way light delay. Chat has the same delay.
- See [Data flow](docs/data-flow.md) for how it works and the experiments behind it.

![Data flow: raw readings → astronaut dashboard → 20 min → doctor dashboard](assets/diagram/data_flow.png)

## Why it matters

By helping astronauts understand their health and take the right action on their own, KOOK lets them play a more active role in managing their well-being on long-duration missions. Astronauts in any field can easily monitor and manage their health.

## Considered values

We believe technology should not make health management more complicated. It should make it easier for people to understand their condition and know what to do next. Throughout the development of KOOK, we focused on three values:

- **Accessibility.** Health information should be understandable even without medical expertise.
- **Real time.** Health data is continuously monitored and updated, so astronauts and medical professionals on Earth stay informed about changes in the astronaut's health and can communicate about them.
- **Expert advice.** Wherever astronauts are in space, they can consult medical professionals on Earth directly.

## What we used

| Area | Tools |
| --- | --- |
| Planning | Notion, Google Docs, draw.io |
| Data collection and analysis | Claude, ChatGPT |
| Design | Figma |
| Development | JavaScript, HTML, CSS |

## Team

Our team's greatest strength is the way we bring together different perspectives and skills. With backgrounds in biology, programming and design, each of us approaches problems differently, but we share the same goal: making space health management more accessible and practical for astronauts.

<!-- Roles: one row per teammate. Fill in from what each teammate wrote. -->
| Name | Background | Role in KOOK |
| --- | --- | --- |
| _TBD_ | | |

## Repository

| Folder | What's inside |
| --- | --- |
| [`dashboard/`](dashboard/) | The KOOK dashboard (astronaut and ground doctor views). See [`dashboard/README.md`](dashboard/README.md) |
| [`test/`](test/) | Test bench: replays a crew's day as Raw → Astronaut dashboard → Doctor dashboard |
| [`data/`](data/) | Crew readings (`crew/{A,B,C,D}_raw.csv`), biomarker rules, health instructions, event calendar |
| [`docs/`](docs/) | [Data flow](docs/data-flow.md): how data moves from Mars to Earth, and the design history |
| [`tools/`](tools/) | Scripts behind the size measurements |
| [`assets/`](assets/) | Logos, profile photos, backgrounds, diagrams |

**Run locally:** serve the repository root, then open http://localhost:8765/dashboard/

```bash
python3 -m http.server 8765
```
