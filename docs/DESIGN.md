# KOOK Design System

**KOOK — Kinetic Observation & Optimal Keel**
A step-by-step health dashboard for astronauts and their ground doctors.

> *One mission. Connected care.*

This document covers how KOOK looks and why: the design principles, the brand system (logo, color, typography, icons), the core UI patterns, and how the interface evolved during the project.

---

## Contents

1. [Design principles](#1-design-principles)
2. [Logo](#2-logo)
3. [Color](#3-color)
4. [Typography](#4-typography)
5. [Iconography](#5-iconography)
6. [UI patterns](#6-ui-patterns)
7. [Key screens](#7-key-screens)
8. [UI evolution](#8-ui-evolution)
9. [Accessibility](#9-accessibility)
10. [Files](#10-files)

---

## 1. Design principles

| Principle | What it means in KOOK |
|---|---|
| **Calm, not alarming** | Astronauts are not medical experts. Status is shown with clear colors and plain words, never with raw numbers alone. |
| **Step by step** | Every problem follows the same path: *see it → act on the guidance → talk to the doctor.* |
| **Two sides, one structure** | Astronauts (Space) and doctors (Earth) use dashboards with the same layout, so both read the same record the same way. |
| **Built around the five hazards** | Schedules, alerts and records are grouped by NASA's five hazards of human spaceflight. |
| **Space as context, not decoration** | The deep-space palette sets the mood; content always sits on clean, high-contrast surfaces. |

---

## 2. Logo

<img src="docs/design/logo-yellow.png" width="360" alt="KOOK logo, neon yellow">

The two **O**s are drawn as eyes looking to the side, a nod to *Kinetic Observation*: KOOK keeps watch over the crew.

| Version | Use on |
|---|---|
| Neon Yellow `#EAFE07` | Primary. Deep blue and space backgrounds |
| White `#FFFFFF` | Photos and busy backgrounds |
| Deep Blue `#07173F` | Light backgrounds and print |
| Electric Blue `#0042A6` | Light backgrounds, secondary use |

<p>
  <img src="docs/design/logo-navy.png" width="220" alt="KOOK logo, deep blue">
  <img src="docs/design/logo-blue.png" width="220" alt="KOOK logo, electric blue">
</p>

**Do**
- Keep clear space around the logo equal to the height of one **O**.
- Use the tagline lockup (*Kinetic Observation & Optimal Keel*) on first appearance, such as onboarding.

**Don't**
- Stretch, rotate or recolor the logo outside the four versions.
- Place the yellow logo on light backgrounds.

---

## 3. Color

<img src="docs/design/colors.png" width="720" alt="KOOK color palette">

### Primary · Deep Blue

The base of the whole interface: backgrounds, text and surfaces.

| Token | Hex | Use |
|---|---|---|
| `blue-50` | `#F6F8FC` | Page background (light) |
| `blue-100` | `#F3F5FA` | Tiles, inputs |
| `blue-200` | `#E3E8F1` | Borders, dividers |
| `blue-300` | `#C9D3E6` | Disabled, secondary text on dark |
| `blue-400` | `#9CA7BB` | Placeholder, captions |
| `blue-500` | `#5F6D88` | Secondary text |
| `blue-600` | `#24407F` | Hover on dark surfaces |
| `blue-700` | `#13285E` | Dark cards |
| `blue-800` | `#0B214F` | Dark panels |
| `blue-900` · **Main** | `#07173F` | Primary text, top bar, main dark background |

### Secondary · Blue

| Token | Hex | Use |
|---|---|---|
| Electric Blue | `#0042A6` | Primary buttons, links, card-title icons |
| Neon Blue | `#0960E1` | Focus, active states |
| Blue Yonder | `#2E96F5` | Charts, highlights |
| Sky | `#A8C8FF` | Chart fills, soft accents |
| Blue Tint | `#E6EEFB` | Selected rows, info backgrounds |

### Accent · Neon Yellow

Used sparingly, for the one thing that matters most on a screen.

| Token | Hex | Use |
|---|---|---|
| Neon Yellow | `#EAFE07` | Logo, key CTA, selected state, role and location tiles |
| Yellow Deep | `#C8DA00` | Pressed state, yellow on light backgrounds |
| Yellow Tint | `#F4FFB0` | Soft highlight backgrounds |
| On Yellow Tint | `#5A6300` | Text on yellow tint |
| White | `#FFFFFF` | Cards, text on dark |

### Status · Signal

| Status in UI | Palette name | Text / Background |
|---|---|---|
| **Normal** | Normal | `#1B7F5A` / `#E2F3EB` |
| **Potential** | Warning | `#C27400` / `#F4FFB0` |
| **Urgent** | Critical | `#E43700` / `#FDE7DF` |
| — | Martian Red | `#8E1100` (supporting emphasis only) |

> The source data uses *Warning* and *Critical*. The interface shows them as **Potential** and **Urgent**, which read more clearly to non-experts.

### Calendar tags

| Tag | Text / Background |
|---|---|
| Mission | `#0042A6` / `#E6EEFB` |
| Biomarkers | `#C8DA00` / `#F4FFB0` |
| Meals | `#7C89A3` / `#EEF1F6` |
| Alerts | `#E43700` / `#FDE7DF` |

> In the final build, the weekly calendar is filtered by the **five hazards** (Radiation, Isolation, Distance, Gravity, Habitat), each with its own icon. See [UI patterns](#6-ui-patterns).

---

## 4. Typography

<img src="docs/design/typography.png" width="720" alt="KOOK typography scale">

Two typefaces:
- **Space Grotesk** gives headings and numbers a technical, mission-control feel.
- **Pretendard** keeps body text easy to read at small sizes.

| Style | Font | Size / Line height / Tracking |
|---|---|---|
| Display | Space Grotesk Medium | 64 / 102% / −3.5% |
| Number | Space Grotesk SemiBold | 44 / 110% / −2% |
| Heading 1 | Space Grotesk Medium | 40 / 120% / −2% |
| Heading 2 | Space Grotesk SemiBold | 20 / 130% / −1% |
| Heading 3 | Pretendard SemiBold | 16 / 140% / −0.5% |
| Body Large | Pretendard Regular | 17 / 150% / −0.5% |
| Body | Pretendard Regular | 14 / 145% / −0.5% |
| Caption | Pretendard Medium | 12 / 150% / 0% |
| Label | Pretendard SemiBold, UPPERCASE | 11 / 140% / +8% |

---

## 5. Iconography

<img src="docs/design/icons.png" width="720" alt="KOOK icon set">

- **Grid:** 24 × 24 px
- **Stroke:** 1.6–1.8 px, round caps and joins
- **Color:** inherits text color (`currentColor`)

| Group | Icons | Style |
|---|---|---|
| **System** | Home, Calendar, Search, Chat, Instruction, Profile, Send, Add, Close, Prev, Next, Open, Alert, Check, Filter, Time | Line, on a dark tile |
| **Health · Mission** | Sleep, Vitals, Biomarker, Mood, Meal, Mission, Habitat, Graph, Signal delay, Add protocol | Line, on a dark tile |
| **Role** | Astronaut, Doctor | Line, on a Neon Yellow tile |
| **Location** | Earth, Mars, Space Station, Rover, Spaceship | Deep Blue disc with yellow features, on a yellow tile. Earth and Mars are traced from real photographs. |
| **5 Hazards** | Radiation, Isolation, Habitat, Gravity, Distance | Line, on a Neon Yellow tile |
| **Measurement method** | Device, Sampling, Computer test | Line; used in the Earth baseline template |

---

## 6. UI patterns

| Pattern | Description |
|---|---|
| **Top bar** | KOOK logo · Space/Earth role switch · main navigation (My Calendar, Health Instruction, Conversation, Profile) · UTC clock and Sol counter |
| **Cards** | White surface, 16 px radius, 24 px gap between cards, 1280 px content width |
| **Status chips** | Pill-shaped chips in the Status colors: *Normal*, *Potential*, *Urgent* |
| **Hazard filter** | Weekly calendar chips: *All · Radiation · Isolation · Distance · Gravity · Habitat*. Each event shows its hazard icon and color. |
| **Hazard board** | A ring of five segments, one per hazard, colored by that hazard's worst status, with the number of items "to check" in the center |
| **Health Instruction (HI)** | Items grouped *Urgent → Potential → Normal*; each opens a detail page with the doctor's guidance |
| **Earth vs Space** | Every biomarker detail compares the in-flight value with the astronaut's own Earth baseline |
| **Signal delay chip** | Shows the current Earth–Mars message delay next to the chat |

---

## 7. Key screens

| Astronaut (Space) | Doctor (Earth) |
|---|---|
| Onboarding: role · crew · location · Earth baseline upload | Onboarding: professional details · crew · baseline records |
| My Calendar: weekly hazard calendar + hazard board + quick search + chat | Crew overview: Health Instruction library + crew switcher + biomarker charts |
| Daily record | Crew page: weekly hazard calendar per astronaut |
| Health Instruction & biomarker detail | Health Instruction library & biomarker detail |
| Conversation with the ground doctor | Conversation with the crew |
| Profile | Profile |

<!-- Add screenshots here, e.g.
<img src="docs/design/screens/space-home.png" width="720">
-->

---

## 8. UI evolution

| Stage | What changed | Why |
|---|---|---|
| **1. Wireframe** | One dashboard with a role switch at onboarding. Space version: weekly calendar, quick search, chat. Earth version: HI library, crew A–D switcher, biomarker charts. | Give astronauts and doctors their own view of the same mission. |
| **2. Visual direction** | Deep blue + white + neon yellow palette, space photography backgrounds, a lighter "Welcome" header and less density. | The first draft felt clinical and crowded. |
| **3. Health Instruction redesign** | Items sorted *Urgent → Potential → Normal*. Biomarker detail pages added: current state, summary, measure period, past record zones and **Earth vs Space** comparison. | Non-experts need to see what matters first, then why. |
| **4. Hazard board exploration** | Four versions tested: table, pentagon, avatar ring and full-width orbit. | The table read like a spreadsheet; a radial form shows five hazards at a glance. |
| **5. Five-hazard calendar** | Calendar filters changed from *Mission / Biomarkers / Meals / Alerts* to the **five hazards**, each with its own icon and color. | Lets astronauts look at the week ahead and prepare for upcoming risks. |
| **6. Final brand system** | New logo, full color scale, type scale and icon set (system, health, role, location, hazards) applied to every screen. All interface text set in English. | Consistency across about 20 screens and both roles. |
| **7. Earth baseline onboarding** | Onboarding asks for Earth health data: template download, upload and the 77 biomarkers it covers. Crew, location and baseline sit on one screen. | Comparing space data with each person's own Earth baseline makes small changes visible early. |

<!-- Optional: add before/after images for each stage under docs/design/evolution/ -->

---

## 9. Accessibility

- Status is never shown by color alone: every color comes with a label (*Normal / Potential / Urgent*) and, where useful, an icon.
- Body text is 14 px or larger; labels use 11 px uppercase only for short tags.
- Neon Yellow is used on Deep Blue, never on white, to keep contrast high.
- Icons that carry meaning have text labels or `aria-label`s.

---

## 10. Files

| Asset | Location |
|---|---|
| Brand sheets (color, type, icons, logo) | `docs/design/` |
| Logo SVG (yellow, white, navy, blue) | `dashboard/assets/kook-logo-*.svg` |
| Location icons | `dashboard/assets/loc-*.svg` |
| Icon set (code) | `dashboard/icons.js` |
| Figma file | *add link* |
