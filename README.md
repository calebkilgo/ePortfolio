# calebkilgo.dev

Personal site of Caleb Kilgo. A static [Astro](https://astro.build) build: one index page, one page per project, and a hand-written WebGL view of real satellite positions.

## Run it

Astro 7 needs **Node 22.23.4 or newer** (Node 24 LTS is a good choice).

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # writes dist/
npm run preview    # serves dist/
npm run check      # type-check
```

`npm run build` first downloads current orbital element sets from CelesTrak. If that fails (no network, rate limit) the build carries on with the snapshot committed in `src/data/`.

## Change the words

Every string on the site lives in [`src/content.ts`](src/content.ts): projects, skills, bio, links, labels. Components hold layout only. Each claim in that file has a comment saying where it came from, and anything unconfirmed is marked `TODO`.

To add a project, add an entry to `projects` in that file. It appears on the index and gets its own page at `/work/<slug>/`. Screenshots go in `src/assets/work/` and are listed in the project's `figures`.

## Deploy

The site deploys on Vercel from this repository. `vercel.json` sets the framework, build command and output directory, so no dashboard changes are needed after the move away from Create React App. It also sets cache and security headers.

Push to `main` to publish. Any other branch gets a preview URL.

Optional: to keep the orbit view current without pushing, create a Deploy Hook in Vercel (Project, Settings, Git) and save its URL as a GitHub Actions secret named `VERCEL_DEPLOY_HOOK`. The workflow in `.github/workflows/refresh-elements.yml` then rebuilds once a day. Without the secret it does nothing.

## Where things are

| Path | What |
| --- | --- |
| `src/content.ts` | All site copy |
| `src/pages/` | `index.astro`, `work/[slug].astro`, `404.astro`, `og.astro` (the social card) |
| `src/styles/` | Plain CSS in cascade layers. `tokens.css` holds colour, type scale, spacing and grid |
| `src/lib/orbit/` | Projection maths and SGP4 tracking, shared by the build and the browser |
| `src/scripts/orbit/` | The orbit view: `boot.ts` (scene, input, telemetry) and `gl.ts` (WebGL2 renderer) |
| `src/data/` | Element-set snapshot and coastline |
| `scripts/` | Font, data, icon and social-card builders, and `verify/` |
| `assets-src/fonts/` | Source fonts and their licences |

## Design in brief

- **Type.** D-DIN Bold for display and labels, Overpass for prose, Overpass Mono for data. DIN 1451 and Highway Gothic are both lettering standards drawn by engineers to be read quickly, which is the reason for the pairing. Fonts are subsetted to 36 KB in total and self-hosted. Fallback faces are scaled to the same average advance and line box, so the swap does not move the page.
- **Colour.** Near-black and near-white, with International Orange used for one thing only: the object being tracked. The research section is printed black on white.
- **Grid.** Twelve columns on a capped measure with fluid margins. Nothing is set below 12px.
- **Motion.** Three moments: the orbit view runs forward from sixteen minutes ago and settles on the present, a project title travels from the index to its page, and selected rows invert. Nothing fades in on scroll.
- **Orbit view.** An orthographic line drawing of Earth with 153 real objects (stations, GPS, weather, science), propagated with SGP4 from CelesTrak element sets. Hidden lines are dashed, the night side is dimmed, and the Huntsville readout gives azimuth and elevation of the tracked object. It loads after first paint, draws only while visible, and falls back to a live SVG drawing without WebGL2 and to a build-time drawing without JavaScript.

## Measured

Run against the production build with `npm run verify` (uses the Chrome installed on the machine). Last results:

| Check | Result |
| --- | --- |
| Lighthouse, mobile profile, home and a project page, 3 runs each | 100 / 100 / 100 / 100 |
| Largest Contentful Paint, simulated slow 4G | 0.76 s home, 0.70 s project page |
| Cumulative Layout Shift, including web fonts held back, 21 widths, every page | 0 |
| Initial JavaScript, compressed | 1.6 KB |
| Page weight, compressed, orbit view aside | 52 KB (orbit view adds 30 KB after first paint) |
| Console errors, failed requests, horizontal overflow at 320 / 768 / 1440 / 2560 | none |

`scripts/verify/vitals.mjs` measures interaction latency under a 4x CPU slowdown. Its readings were not stable enough on the development machine to quote a number here.

## Content to confirm

These are marked `TODO` in `src/content.ts`.

1. **Satellite Tracker role.** Shown as "Sole developer", inferred from the commit history. The old site never stated it.
2. **SMART Assistant image model.** The old site says CLIP, the resume says SigLIP 2. Neither is shown in the stack until confirmed.
3. **SMART Assistant link.** The public `Automobile-RAG` repository is an early LangChain and Chroma version, so it is not linked.
4. **Smart Mirror.** No year, status, repository or photos were found, so those fields are left off.
5. **Dates.** The site now follows the resume (degree 2025 to 2029, research from September 2025). The old site said 2023 and 2024.
6. **SMART Scholarship.** Written as "sponsored by the Missile Defense Agency". Add the award year if you want it shown.
7. **Availability line.** The old "Open to research roles and software engineering internships" was left out pending confirmation.
8. **Dataset link.** The research section links the public `cs-traceability-dataset` repository.
9. **PyTorch** is listed in the cFS stack on the strength of the resume's library list.

## Credits

- D-DIN, © Datto Inc., drawn by Monotype. SIL Open Font License 1.1. "D-DIN" is a Reserved Font Name, so the subset shipped here carries the name "CK DIN".
- Overpass and Overpass Mono, © The Overpass Project Authors (Delve Fonts for Red Hat). SIL Open Font License 1.1.
- Orbital elements from [CelesTrak](https://celestrak.org). Propagation by [satellite.js](https://github.com/shashwatak/satellite-js).
- Coastlines from [Natural Earth](https://www.naturalearthdata.com), public domain.
