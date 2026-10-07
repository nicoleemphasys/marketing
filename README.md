[README-for-claude-code.md](https://github.com/user-attachments/files/33170580/README-for-claude-code.md)
# Emphasys NAHRO 2026 Booth Loop Video: Build Instructions

Build a 60-second, silent, looping **motion graphics and type** video for Emphasys Software's trade show booth (#1504, NAHRO National Conference). There is **no footage** in this video: everything is animated text, shapes, icons and gradients. The audience is public housing authority staff. Tagline: "For the people who house people."

The feel: light, fresh, fast. Mostly white and pale-blue backgrounds, deep navy type, orange for the key phrase, quick cuts (a new beat every 1.5–2 seconds) with occasional full-color flash frames.

## What's in this folder

- `boards/00-look-and-motion-guide.jpg` — read first. Colors, backgrounds, type, and the named animations.
- `boards/s01…s09-*.jpg` — one board per scene showing every beat, its frame range, the on-screen copy and the motion.
- `frames/*.jpg` — each beat at full 1920×1080. Match these layouts, sizes and colors at the stated frames.
- `assets/` — (add) `logo.svg` and font files if available. No video clips are needed.

## Technical specs

- 1920×1080, 30 fps, 1800 frames (60 s), no audio. Export MP4 (H.264, CRF 18).
- The last frame (1799) must match frame 0: white background, roofline drawn 45%. The loop should have no visible restart.

## Brand tokens

| Name | Hex | Use |
|---|---|---|
| White | #FFFFFF | Main background, with soft sky and orange radial glows |
| Deep navy | #052E65 | All main type; navy punch frames |
| Navy | #21437C | Gradients, chat bubbles, icons |
| Sky blue | #43A7F9 | Glows, rings, chart bars, sky flash frames (~10% of screen) |
| Orange | #F76B13 | One key phrase per beat, tiles, checks, roofline, orange flash frames |

Backgrounds (see guide board): Paper (white + soft glows, about 60% of the video), Mist (pale blue gradient), Sky flash, Orange flash, Navy punch (used only twice: “That's you.” and the closing logo). 6% film grain on everything.

Font: Avenir Next LT Pro if in `assets/fonts/`, otherwise Poppins Bold (700). Tracking −3%. Nothing on screen under 60px.

## Recurring graphics

- **Roofline:** orange→sky gradient chevron that draws itself. Opens and closes the loop, sits on the house, frames the logo.
- **Tile house:** a 4×3 grid of rounded tiles (sky, orange, navy) under the roofline. Builds in Scene 1, returns in Scene 9 with one empty slot that an orange tile drops into (this mirrors the booth's tile activation).
- **Vessel tag:** white pill + 5-dot tracker, top-left in Scenes 3–7. Current dot orange, finished dots sky.
- Icons (paper sheets, cursor, calendar, check grid, route, phone, chat bubbles, chart, dot map) are simple flat shapes, built in code, matching the frames.

## Beat list (use this copy exactly)

| Beat | Frames | On screen | Motion |
|---|---|---|---|
| 1.1 | 0–40 | (no text) | Loop start. Clean white frame. The orange-to-sky roofline begins drawing at center. |
| 1.2 | 40–85 | Every home | Roof slides right and lands on a house. Tiles pop in one by one, 3 frames apart. Text rises in. |
| 1.3 | 85–150 | starts with someone who did the work. | House completes. Lines kinetic-stack in from alternating sides; last two lines in orange. |
| 2.1 | 150–200 | Intake. Recerts. | Word flicker: each word holds 12 frames, then hard-cuts to the next. Slight scale-up (100→104%) while on screen. |
| 2.2 | 200–250 | Inspections. Waitlists. | Background flash-cuts to sky blue every second word. Text stays deep navy. |
| 2.3 | 250–300 | Payments. Deadlines. | Orange flash. Words get faster here: 10 frames each, building energy. |
| 2.4 | 300–345 | All before lunch. | Beat of humor. Everything stops; line rises in. A sky squiggle draws underneath. |
| 2.5 | 345–390 | That's you. | Navy punch frame. Scale slam: 150% → 96% → 100% in 8 frames with motion-blur ghost and 6px shake. |
| 3.1 | 390–450 | Less paper. | Vessel tag slides in. Paper sheets pop in scattered at angles, overlapping. |
| 3.2 | 450–500 | Fewer clicks. | Whip cut from the left. Cursor clicks once; sky rings ripple out from the click. |
| 3.3 | 500–570 | More time for people. | Every sheet flies in and stacks into one neat card. Text kinetic-stacks. |
| 4.1 | 570–630 | Review next week? | Calendar pops in and the orange “!” badge bounces twice. Text rises in. |
| 4.2 | 630–680 | Ready. | Sky flash frame. “Ready.” scale-slams with a small shake. Holds 40 frames. |
| 4.3 | 680–750 | Every file. Every deadline. | Check circles pop in a fast ripple (2f apart) across a 3×3 grid. Last one still drawing. |
| 5.1 | 750–810 | Fewer trips downtown. | A dotted route draws from a home icon to an office building, then an orange X stamps over the trip. |
| 5.2 | 810–860 | Done from the kitchen table. | Phone slides up; the “Submitted” card pops out at 105% and settles. Rings ripple. |
| 5.3 | 860–930 | Faster answers for families. | Mask wipe: a thin orange bar sweeps left to right revealing each line (12f per line). |
| 6.1 | 930–990 | Hard day? | Chat bubble pops up from bottom-left, overshoots, settles. Navy bubble, white text. |
| 6.2 | 990–1040 | We pick up. | First bubble shrinks up. Typing dots blink for 12 frames, then the orange reply pops in from the right. |
| 6.3 | 1040–1110 | Real people on the other end. | Bubbles fly off screen; line rises & unblurs. |
| 7.1 | 1110–1170 | See it sooner. | Bars grow in sequence; the orange line draws across above them. |
| 7.2 | 1170–1220 | Across every property. | Dots appear, then light orange in a ripple; thin sky lines link them. |
| 7.3 | 1220–1290 | Act while there's time. | Chart fades back to 18%. Line rises in. Hold 50 frames. |
| 8.1 | 1290–1350 | Since 1976 | “Since” sits small at top-left while the year counter rolls like a slot reel from 1976 upward. |
| 8.2 | 1350–1400 | 2026 | Orange flash. 2026 lands with a bounce and a ghost echo. |
| 8.3 | 1400–1470 | 50 years of showing up for the people who house people. | Lines kinetic-stack in quickly (6f apart). Last line orange. |
| 9.1 | 1470–1560 | What makes home possible? | House returns with one empty slot. Question rises in and holds 60 frames. |
| 9.2 | 1560–1650 | Come add your tile. Booth #1504 | An orange tile drops into the empty slot with a bounce. Booth pill pops in. |
| 9.3 | 1650–1740 | [logo] For the people who house people. | Navy close. Roofline draws over the logo; tagline rises in underneath. |
| 9.4 | 1740–1800 | (no text) | Everything clears to white; the roofline un-draws back to the exact state of frame 0. Loop. |

Do not add or rewrite copy. Charts and maps never show numbers or labels.

## How to build

1. Use Remotion (if licensed) or Motion Canvas. Keep all beats, copy, colors and timing in one config file.
2. Build the named animations from the guide board as reusable components first.
3. Phase 1: build all 30 beats, render a low-res preview, and stop for review.
4. Phase 2: polish easing, color flashes, whip cuts and the loop point. Render the final MP4 plus a short loop check (frames 1740–1799 then 0–150).
