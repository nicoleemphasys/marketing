# Emphasys NAHRO 2026 booth loop: code build

A 60-second silent 1920×1080 / 30 fps loop (1800 frames) built only from type and shapes. It is drawn on an HTML canvas and rendered with headless Chromium and ffmpeg. There are no Remotion license requirements.

## Layout

| Path | What |
|---|---|
| `src/config.js` | Single source of truth: brand colors, font, flash frames, vessel tags, and all 30 beats (frames, exact copy, background, motion). `*words*` = orange phrase. |
| `src/lib.js` | Named animations from the look guide: rise & unblur, kinetic stack, mask wipe, pop & settle, roofline draw, plus backgrounds (paper, mist, sky, orange, navy) with slowly drifting glows. |
| `src/scenes.js` | One renderer per beat: word flicker, scale slam, whip cut, tile house, vessel tag, sheets, calendar, checks, route, phone, chat bubbles, chart, dot map, year reel, logo close. |
| `index.html` | Preview player (open in Chrome, scrub/play). Also the page `render.js` drives. |
| `render.js` | Renders frames in parallel and pipes them to ffmpeg (H.264, CRF 18). Adds about 6% temporal film grain there. |
| `assets/` | Poppins 400/500/700 (OFL), the original logo, and a reversed wordmark used on the navy close. The animated roofline is the logo's roof. |

## Commands

```bash
npm install            # playwright (Chromium) – ffmpeg must be on PATH
npm run render         # out/emphasys-nahro-2026-loop.mp4  (final, 1080p, CRF 18)
npm run preview        # out/preview-540p.mp4               (low-res review copy)
npm run loopcheck      # out/loop-check.mp4  (frames 1740–1799 then 0–150)
npm run stills         # out/stills/frameNNNN.png at each beat start
```

Every frame is a pure function of the frame number. Frame 1799 un-draws the roofline back to frame 0's state (white, chevron drawn 45%), and the background glows drift on a 1800-frame period, so the loop has no visible seam.

## Notes / decisions

- Font: Avenir Next LT Pro wasn't supplied, so Poppins Bold is used, at −3% tracking. To swap it, drop Avenir woff2 files in `assets/fonts/` and change `@font-face` plus `CONFIG.font.family`.
- Word flicker (2.1–2.3): the beats are 50 frames long, but words hold only 10–12 frames, so each pair cycles: Intake/Recerts ×2, Inspections (sky)/Waitlists ×2, then Payments (orange)/Deadlines/Payments. No copy was added.
- 2-frame color-flash cuts sit on the last two frames before each scene change (`CONFIG.flashes`).
- The vessel tag label is about 34px to match the reference frames, which goes against the "nothing under 60px" rule. Change it in `vessel()` if the rule should win.
