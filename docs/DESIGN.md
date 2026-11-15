# KOOK Design System

**KOOK — Kinetic Observation & Optimal Keel**
A step-by-step health dashboard for astronauts and their ground doctors.

> *One mission. Connected care.*

---

## Contents

1. [Logo](#1-logo)
2. [Color](#2-color)
3. [Typography](#3-typography)
4. [Iconography](#4-iconography)
5. [UI patterns](#5-ui-patterns)
6. [Key screens](#6-key-screens)
7. [Accessibility](#7-accessibility)

---

## 1. Logo

<p align="center">
  <img src="docs/logo-yellow.png" width="560" alt="KOOK logo">
</p>

The wordmark is built from bold, geometric letters. Its two **O**s are drawn as a pair of eyes glancing to the side.

They stand for KOOK's role: **keeping watch over astronauts and protecting them, wherever they are in space**. The full name, *Kinetic Observation & Optimal Keel*, carries the same idea: observe the crew's health closely and keep them steady, like a ship's keel.

---

## 2. Color

KOOK's palette references the [NASA Space Apps Challenge brand guidelines](https://www.spaceappschallenge.org/brand/) and adapts them to KOOK: deep space blues as the base, with one bright neon accent.

| | Role | Hex | Use |
|---|---|---|---|
| ![](https://placehold.co/24x24/07173F/07173F.png) | **Primary · Deep Blue** | `#07173F` | Main background, top bar, primary text |
| ![](https://placehold.co/24x24/0042A6/0042A6.png) | **Secondary · Electric Blue** | `#0042A6` | Buttons, links, active states |
| ![](https://placehold.co/24x24/EAFE07/EAFE07.png) | **Accent · Neon Yellow** | `#EAFE07` | Logo, key actions, selected states |
| ![](https://placehold.co/24x24/E43700/E43700.png) | **Status · Signal** | `#1B7F5A` Normal · `#C27400` Potential · `#E43700` Urgent | Health status chips and alerts |

<img src="docs/design/colors.png" width="720" alt="KOOK color palette">

---

## 3. Typography

KOOK uses two typefaces:
- **Space Grotesk** for headings and numbers, for a technical, mission-control feel.
- **Pretendard** for body text, which stays clear at small sizes.

<img src="docs/design/typography.png" width="720" alt="KOOK typography scale">

---

## 4. Iconography

- **Grid:** 24 × 24 px
- **Stroke:** 1.6–1.8 px, round caps and joins
- **Sets:** System · Health & Mission · Role · Location · 5 Hazards

<img src="docs/design/icons.png" width="720" alt="KOOK icon set">

---

## 5. UI patterns

| Pattern | Description |
|---|---|
| **Top bar** | KOOK logo · Space/Earth role switch · main navigation (My Calendar, Health Instruction, Conversation, Profile) · UTC clock and Sol counter |
| **Cards** | White surface, 16 px radius, 24 px gap between cards, 1280 px content width |
| **Status chips** | Pill-shaped chips in the status colors: *Normal*, *Potential*, *Urgent* |
| **Hazard filter** | Weekly calendar chips: *All · Radiation · Isolation · Distance · Gravity · Habitat*. Each event shows its hazard icon and color. |
| **Hazard board** | A ring of five segments, one per hazard, colored by that hazard's worst status, with the number of items "to check" in the center |
| **Health Instruction (HI)** | Items grouped *Urgent → Potential → Normal*; each opens a detail page with the doctor's guidance |
| **Earth vs Space** | Every biomarker detail compares the in-flight value with the astronaut's own Earth baseline |
| **Signal delay chip** | Shows the current Earth–Mars message delay next to the chat |

---

## 6. Key screens

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

## 7. Accessibility

- Status is never shown by color alone: every color comes with a label (*Normal / Potential / Urgent*) and, where useful, an icon.
- Body text is 14 px or larger; 11 px uppercase is used only for short labels.
- Neon Yellow is used on Deep Blue, never on white, to keep contrast high.
- Icons that carry meaning have text labels or `aria-label`s.
