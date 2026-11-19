This is an EmDash site -- a CMS built on Astro with a full admin UI.

## Commands

```bash
pnpm dev              # Start the Astro dev server
npx emdash types      # Regenerate TypeScript types from a running site
```

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                    |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                           |
| `seed/seed.json`         | Schema definition + demo content (collections, fields, taxonomies, menus, widgets) |
| `emdash-env.d.ts`        | Generated types for collections (auto-regenerated on dev server start)             |
| `src/layouts/Base.astro` | Base layout with EmDash wiring (menus, search, page contributions)                 |
| `src/pages/`             | Astro pages -- all server-rendered                                                 |

## Skills

Agent skills are in `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, rendering Portable Text, schema design, seed files, site features (menus, widgets, search, SEO, comments, bylines). Start here.
- **creating-plugins** -- Building EmDash plugins with hooks, storage, admin UI, API routes, and Portable Text block types.
- **emdash-cli** -- CLI commands for content management, seeding, type generation, and visual editing flow.

## Documentation

The EmDash docs are available as an MCP server at `https://docs.emdashcms.com/mcp`. When you need to verify an API, hook, config option, field type, or pattern, call `search_docs` against the live documentation rather than relying on training-data recall. The docs reflect current behaviour; assumptions may not.

This template ships with `.mcp.json`, `.cursor/mcp.json`, and `.vscode/mcp.json` so Claude Code, Cursor, and VS Code auto-discover the docs server. Other tools (OpenCode, Windsurf, etc.) need a manual one-time setup -- see [docs.emdashcms.com/docs-mcp](https://docs.emdashcms.com/docs-mcp).

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are objects (`{ src, alt }`), not strings. Use `<Image image={...} />` from `"emdash/ui"`.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls like `getEntryTerms`).
- When Astro's cache is enabled, pass content-query hints to `Astro.cache.set(cacheHint)`. Use the `WithCacheHint` variants for site settings, menus, taxonomies, and widget areas rendered by cached routes.
- Taxonomy names in queries must match the seed's `"name"` field exactly (e.g., `"category"` not `"categories"`).

## This Site

Fayaz Ahmed's personal site, designed as **one page of a field notebook** lying on a flat dusty-blue desk. Left column (sticky): who I am. Right column: the feed, filtered by tabs (All, Projects, Articles, Talks, Videos, Photos, Uses).

### The rules that keep it one thing

1. **One sheet of paper.** Grain prints through everything on it (`.paper::after`). A turned-down corner top right.
2. **Anything "made by hand" is pen and wash.** Borders and rules go through the `#pencil` SVG filter (`PencilDefs.astro`); add `.sketch` / `.sketch--dashed` to an element. Links are underlined with a clay scribble (`.hand-link`). The active tab is circled in pen (a sliding circle, `transitions.css`). Illustrations are pen-and-watercolour on transparent backgrounds, all generated with the same prompt style (`public/art/`, via `Spot.astro`), never boxed, never in another style.
3. **Anything that isn't hand-made is taped in** as a print (`.print` + `.tape`): screenshots, photos, the avatar.
4. **Voices.** Geist Sans for body and UI text, and Geist Serif (Vercel's serif, SIL OFL, self-hosted from `src/assets/fonts/`, single weight) for titles only (name, entry/row/article/empty titles, footer line; see the "titles" rule near the top of `notebook.css`), Courier Prime (`.mono`) for labels, dates and numbers, Caveat (`--font-hand`) for the odd margin note. One accent, clay, only for hand marks and selection.
5. **Lists are a contents page**: serif title, dotted leader, typewriter number (`.row`, `.index`).

### Files

- `src/layouts/Base.astro`: desk, paper, two columns, footer. Tabs, intro reveal and copy button logic is the inline script at the bottom.
- `src/components/Profile.astro` (left column), `FeedItem.astro` (one entry, per kind), `Spot.astro` (sketches), `Doodle.astro` (the "hi" arrow, the only animated "boil" mark).
- `src/styles/theme.css` (palette), `notebook.css` (everything), `transitions.css` (transitions.dev: tabs sliding as a pen circle, icon swap, text swap, texts reveal).
- Profile copy, links, and the tab list: `src/site.ts` and `Profile.astro`.
- Single light theme. Hugeicons (`Icon.astro`) only for functional icons (play).

### Alive (small living things)

All behaviour is in `src/scripts/alive.js`, CSS at the end of `notebook.css`. All of it is optional decoration; reduced-motion users get still versions.

- **Scroll bird** (`FlyingBird.astro`, inline script in `Base.astro`): one bird flies across a row between feed entries, flapping with scroll distance. Sprite strips are `public/art/bird-sprite.webp` (day) and `moth-sprite.webp` (night), six frames each, laid out in a row.
- **Cat on the note** (`Cat.astro`, `cat-pack.webp`: frames 0-1 asleep, 2 left, 3 ahead, 4 right, 5 stretch): wakes and watches the cursor; click for "purrr". **Footer cat** (`Walker.astro`, `cat-walk.webp`): walks the ground line as you scroll to the bottom, then sits by the desk.
- **Time of day**: `<html data-time="dawn|day|dusk|night">`, set before paint from the visitor's local hour; click the sun/moon in the desk margin (wide screens) to cycle it for the current tab session only, or add `?time=night` to override. Overrides are not persisted across visits. Colours in `theme.css`.
- **Strokes draw themselves**: rules between entries, the footer ground line and the search underline are revealed with a `clip-path` when they scroll into view (`.is-drawn`); the tab circle draws with a conic mask. Gotcha: never observe an element that clips itself with `clip-path` (IntersectionObserver treats it as invisible); observe its parent.
- **Peelable tape / flipping polaroid**: click a `.tape` to peel it off (capture-phase handler, so taped links don't navigate); the avatar is a button that flips to a handwritten back.
- **Stickers on /uses** (`src/scripts/stickers.js`, CSS at the end of `notebook.css`): every Uses entry can have a `sticker` image, a die-cut preview with a white border baked in. Drag one and it peels: the base is clipped at a fold line perpendicular to the drag and a mirrored paper-white "back" folds over it. Past ~70% it comes off, turns over to its front, and becomes a free sticker on `<body>` (so it can sit on the desk too). Drop it back on its spot or double-click it to stick it back. Nothing is saved. To add one: get a transparent PNG (for a photo, `swift scripts/cutout.swift photo.jpg cut.png`, macOS only), then `node scripts/sticker.mjs cut.png public/stickers/<slug>.webp --clean`, and point the entry's `sticker` field at `/stickers/<slug>.webp`.
- **Margin notes**: optional `note` field on every feed collection, shown as a handwritten aside with an arrow. Keep them factual.
- **Paper plane** (`alive.js`, `plane-solo.webp`): flown by physics, not a drawn path. A point-mass glider with lift, drag, gravity, gusts and a wandering bank angle, so it does what a real paper plane does (thrown up, slows, noses over, dives, pulls out in a rolling wave, settles into a glide, drifts toward and away from you). Every flight differs. It's thrown from the "hi, I'm Fayaz" note about 1s after the page opens (first load of a visit, or any browser refresh; `?plane` forces it, `?plane=slow` plays it 6x slower; clicking the note throws it again) and leaves a dotted trail that fades. The drawing's nose points ~16deg upward, so heading is corrected by `PLANE_ART_ANGLE`. Fixed, pointer-events-none overlay so it crosses the desk as well as the paper.

### Art

Generated with Replicate `openai/gpt-image-2.6-flare`, `background: transparent`, PNG, then trimmed and converted to WebP. Prompt prefix for spots: "A small delicate hand-drawn pen-and-ink sketch with a loose watercolour wash and fine linework, like a page from a field notebook. Muted natural palette: sage green, dusty blue, warm terracotta, soft grey, warm black ink line. One isolated subject, generous untouched white around it, the wash fading softly at the edges, no frame, no ground rectangle. Fully transparent background, no text." The footer is deliberately quiet: a pencilled ground line with the `desk` sketch standing on it. (A full-width illustrated footer was tried twice, a vignette and an edge-to-edge meadow, and both read as heavy and pasted-on. Don't bring one back.) To add a sketch, generate it this way and add its size to `Spot.astro`. Sprite sheets: generate a 3x2 grid of six frames on a transparent background, slice, align (bottom-centre for cats, centroid for flyers), and lay the six frames out in one row.

## Pages

`/` all (with sketches between entries), `/projects`, `/posts` and `/posts/[slug]`, `/talks`, `/videos`, `/photos`, `/uses`, `/search`, `/rss.xml`.

## Schema

Collections (see `seed/seed.json`): `posts` (Articles), `projects`, `talks`, `videos`, `photos`, `uses`, `pages`.

- `src/lib/feed.ts` merges collections into one feed, ordering each kind by its own date field (`sort_date` for projects, `date` for talks/videos, `taken_at` for photos, else `publishedAt`). Pinned entries go first.
- Only projects with `featured: true` show on `/`; `/projects` shows all.
- Project screenshots live in `public/projects/` and are referenced by the `featured_image` field.
- `status` is a reserved EmDash field name, so the project label field is `badge`.

## Design rules

- Ease with `--ease-out`, press scale `0.96`, hover styles gated by `(hover: hover) and (pointer: fine)`.
- Pencil filters go on thin or small things (borders, rules, rings), not on blocks of text.
- No arrows on links. No avatar on feed entries. No new visual language: if it isn't pen, wash, tape or type, it doesn't belong.
