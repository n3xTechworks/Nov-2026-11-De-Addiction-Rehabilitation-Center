# Harborlight Recovery Centre (Website 11: De-Addiction & Rehabilitation Center)

Static front end (HTML, CSS, vanilla JS). Dashboard: **No** (no login, sign-up or dashboard pages).
Open `index.html` directly in a browser; no server or backend needed.

## Pages
Home 1 (`index.html`), Home 2 (`home-2.html`), About, Programs, 4 program detail pages (`program-residential`, `-outpatient`, `-detox`, `-aftercare`),
Facilities (with a virtual-tour lightbox), Blog + 7 articles (`blog-post-1..7`), Contact (confidential enquiry form `#enquiry`, FAQ, map), Help, Privacy, Terms, 404.

## Structure
- `src/pages/*.html` page sources, `src/partials/` (head, header with helpline bar, footer, logo), `src/templates/program.html` (detail-page template)
- `data/programs.json` the 8 programs (core programs carry full detail-page content) -> generated `data/site-data.js`
- `css/site.css` shared design system, `css/pages/*.css` page styles; `js/site.js` shared behaviour (theme, RTL, menu, carousel, lightbox, filters, motion),
  `js/validation.js` form validation, `js/pages/*.js`
- `images/` WebP photos; `images/ASSIGNMENT.md` says which page owns each photo (no photo is reused across pages)
- `COMPONENTS.md` component and design guide for anyone editing pages

## Build
```bash
python3 scripts/build.py      # regenerates every root *.html from src/ (stdlib only)
```
Never edit the generated root `*.html` files by hand.

## Tests
```bash
bash tests/run-tests.sh            # build + validator unit tests + full-site QA (Playwright)
bash tests/run-tests.sh --quick    # fewer widths
node tests/qa.cjs . --pages index.html
```
`tests/validation.test.js` (node:test) covers name / email / phone / date rules. `tests/qa.cjs` checks the client checklist on every page:
one h1, logo links home, nav order (Home, About, Programs, Facilities, Blog, Contact), CTA to `contact.html#enquiry`, no login/dashboard links,
theme/RTL/CTA shown once with equal height and radius, footer icons/socials/Privacy/Terms, only the navbar sticky, hero overlay and max 2 CTAs,
equal inner-hero heights, level card text, no image reuse, blog authors/covers unique, form validation (name, lowercase email, digits-only phone),
contact map + FAQ, RTL plaintext, contrast in light and dark themes, and no horizontal scroll at 360 to 1440px.
