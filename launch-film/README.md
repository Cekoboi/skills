# Higgsfield MCP × Claude — "Trail Build" launch film

A 30-second, 1920×1080 (16:9) 3D launch film built entirely in code: Three.js for the 3D set,
Canvas2D for the laptop UI, HTML/SVG for sharp overlay typography and logos, and a custom post
pipeline for the look. It rebuilds the reference edit (`kereta.mp4`) with the same story beats, copy
structure and rhythm, and replaces the truck with a bicycle built from recognisable components.

**Deliverables**

| File | What |
| --- | --- |
| `out/higgsfield-claude-launch.mp4` | Final film: 30.0 s, 1920×1080, 30 fps, H.264 High (22 Mb/s, 2-pass) + AAC 320k |
| `out/audio.wav` | Mixed soundtrack (48 kHz stereo): original score + SFX |
| `out/cue-sheet.json` | Every SFX cue with its time (generated from the edit) |
| `out/contact-sheet.png` | One frame per shot |
| `src/`, `scripts/`, `assets/`, `index.html` | The editable project |

## Run it

```bash
npm install                       # three, opentype.js (Playwright + ffmpeg must be on the machine)
npm run serve                     # http://127.0.0.1:5173/index.html?t=19.6  → inspect any frame
npm run audio                     # → out/audio.wav + out/cue-sheet.json
npm run render                    # → out/higgsfield-claude-launch.mp4 (frames cached in out/frames)
node scripts/render.js --preview  # one still per shot + contact sheet in out/preview
node scripts/render.js --stills 12.6,27.3
node scripts/render.js --from 18 --to 21.2 --force   # re-render a range (then run render again to mux)
```

Rendering is deterministic: `window.renderFrame(t)` is a pure function of time, so frames can be
rendered in any order, in parallel (`--workers N`), and re-rendered individually after an edit.

## Where to edit what

| Change | File |
| --- | --- |
| Shot timing, all on-screen copy, camera keys, focus, sound cues, music tempo | `src/config/timeline.js` |
| Colours, logo files, font files/roles | `src/config/brand.js` |
| Bicycle geometry (angles, wheel size, wheelbase, bar width…), parts, materials | `src/scene/bicycle.js` (`BIKE`) |
| Assembly order and timing of each part | `ASSEMBLY` in `timeline.js` |
| Test-ride / ramp / backflip physics (speed, airtime, apex) | `RIDE` in `timeline.js` |
| Desk, laptop, props, ramp | `src/scene/desk.js` (`LAPTOP`, `SPOTS`) |
| Laptop UI layout + states | `src/ui/screen.js` (`UI_LAYOUT`) |
| Lockups, HUD, captions, tagline, hand-drawn accents | `src/ui/overlay.js` |
| Look: DOF, bloom, streaks, flares, dust, grain, halftone, grade | `src/post/composite.js` |
| Score + SFX synthesis | `scripts/audio.js` |

## The edit (30.0 s)

| Time | Shot | Beat |
| --- | --- | --- |
| 0.0–1.5 | desk | Top-down establishing; phone shows the rusty bike |
| 1.5–3.3 | title | Higgsfield MCP × Claude lockup; extruded **OPUS 5.5** tumbles onto the mat |
| 3.3–5.4 | scan | The rusty bike, photo HUD + scan line |
| 5.4–6.2 | rise | Camera lifts over the bike into the laptop |
| 6.2–8.0 | prompt | "What should we build today?" + attachments, typed prompt |
| 8.0–9.0 | adaptive | Macro: Adaptive mode, send |
| 9.0–10.0 | checking | "Checking if this bike can handle a trail build" → whip pan |
| 10.0–11.6 | popout | The bike emerges through the display (clipped by the screen plane), opens up; ANALYZE |
| 11.6–12.0 | wipe | Hand-drawn lime brush wipe |
| 12.0–14.5 | inspect | Parts laid flat: wheels **12 %**, frame **96 %** |
| 14.5–15.8 | verdict | "Frame is in perfect condition…" · Using Higgsfield |
| 15.8–18.0 | plan | Plan cards pop out of the screen, 0/4 → 4/4 with stamps |
| 18.0–21.2 | assembly | Frame on a work stand → fork → wheels → bars → cranks/pedals → chain → saddle, then a repaint sweep |
| 21.2–22.0 | wheel *(new)* | Macro on the knobby front wheel freewheeling |
| 22.0–23.4 | visuals | Design visuals pop out of the screen |
| 23.4–25.2 | model | Live 3D viewport, check stamp, "Compile a universal build guide?" → Yes |
| 25.2–26.3 | ride *(new)* | Test ride across the desk |
| 26.3–28.4 | flip | Ruler ramp → one continuous backflip → landing; tagline types on |
| 28.4–30.0 | end | Lockup + availability line |

## Bicycle

Authored in real-world metres and scaled to a desk toy (`BIKE.scale`). 29er hardtail geometry:
73° seat angle, 66° head angle, 44 mm fork offset, 430 mm chainstays, 1.18 m wheelbase, Boost hub
spacing, 780 mm riser bar, 170 mm cranks. The fork length is solved so the front axle sits at wheel
height. Components are separate groups with an insertion axis each:

- **fork** slides up the steering axis into the head tube
- **wheels** rise vertically into the dropouts (the bike is lifted on a work stand so nothing passes through the desk)
- **handlebars/stem** drop down the steerer
- **drive-side crank** slides in from the right, **left crank** from the left, **pedals** thread in (with rotation)
- **chain + derailleur** go on after the rear wheel (so the cassette never passes through the derailleur)
- **saddle/seatpost** drops down the seat-tube axis

Clearances were checked analytically (tyre vs. seat tube/down tube/arch/bridge, rotors vs. stays and
fork legs, chainring vs. chainstay, cassette vs. spokes). During the test ride a ground clamp keeps the
lowest tyre point on the desk/ramp, and the backflip is a single monotonic ease from the ramp angle to
360° — no pause, no reversal.

## Assets and substitutions

- **Logos:** `assets/brand/claude-mark.svg` is the official Claude symbol; `assets/brand/higgsfield-mark.svg`
  is the glyph from the higgsfield.ai site header. Both are used as vectors everywhere (overlay SVG, UI Path2D).
- **Fonts:** the brief mentions attached fonts, but only the reference video was shared, so the film uses
  stand-ins: Inter (UI), Manrope (display / 3D title), Space Grotesk (tagline, HUD). Drop the campaign fonts
  into `assets/fonts/` and update `BRAND.fonts` + the `@font-face` block in `index.html`.
- **Bicycle reference image:** not included in the shared folder; the bike is a generic modern trail hardtail.
  Proportions are parameters in `BIKE`, so it can be matched to a specific bike quickly.
- **Music & SFX:** original, synthesised in `scripts/audio.js` — no third-party audio.
