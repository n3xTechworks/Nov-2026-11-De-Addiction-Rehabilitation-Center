# Image assignment: Harborlight Recovery Centre

Rule: every photo lives on exactly ONE page. Only exception: `blog-N` cover + `author-N` portrait appear on `blog.html` AND their own `blog-post-N.html`.
Files: scenes `<slot>-800.webp` / `-1600.webp` (heroes also `-2000.webp`), portraits `<slot>-160.webp` / `-800.webp`. QA (`tests/qa.cjs`) fails on any reuse.

## Decision (programs, homes, journey photos)
There are 7 `program-*` photos and 8 programs, and each core program also needs a hero for its own detail page. So:
- The 4 core programs (residential, outpatient, detox, aftercare) use `program-<slug>` as the **hero of their own detail page** (set automatically by the `program` template).
  On `programs.html` and on the home pages the core programs appear as **photo-less numbered list rows** (`{{program_index core}}`), which link to those detail pages.
- `programs.html` shows the 4 specialist programs as **photo list rows** (`{{program_rows specialist}}`): family, dual diagnosis, digital, and alcohol recovery (which uses `journey-1`, "a first private call").
- `journey-2` and `journey-3` illustrate Home 1's support story bands; `journey-4` and `about-community` belong to Home 2.

| Page | Photos (slots) |
|---|---|
| index.html (Home 1) | hero-home1, journey-2 (medical support story band), journey-3 (rehabilitation support story band), testi-1, testi-2, testi-3 (quote carousel) |
| home-2.html (Home 2) | hero-home2, journey-4, about-community, testi-4, testi-5, testi-6 (quote carousel) |
| about.html | hero-about, about-story, about-approach, team-1 .. team-6 (arched portraits), founder-1 (founder note) |
| programs.html | hero-programs, prog-residential, prog-outpatient, prog-detox, prog-aftercare (core program rows, hand-written), program-family, program-dual, program-digital, journey-1 (alcohol recovery row) |
| program-residential.html | program-residential (hero, via template) |
| program-outpatient.html | program-outpatient (hero, via template) |
| program-detox.html | program-detox (hero, via template) |
| program-aftercare.html | program-aftercare (hero, via template) |
| facilities.html | hero-facilities, facility-room, facility-twin, facility-yoga, facility-gym, facility-garden, facility-art, facility-dining, facility-medical (the virtual-tour gallery + lightbox re-shows ONLY these, on this page) |
| blog.html | hero-blog, blog-1 .. blog-7 (covers), author-1 .. author-7 |
| blog-post-N.html | blog-N (hero/cover), author-N (byline) |
| contact.html | hero-contact |
| help, privacy, terms, 404 | none (photo-less `.title-band`) |

All 60 delivered slots are assigned once. Do not use a photo that is not listed for your page; ask the foundation owner instead.
