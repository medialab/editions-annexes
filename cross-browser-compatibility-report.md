# Cross Browser Compatibility Report

## Scope
- Project type: SvelteKit + TypeScript + Tailwind (Bun scripts available).
- Analysis mode: read-only audit, no code changes.
- Evidence sources: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/**/*.svelte`, `src/**/*.css`, `src/**/*.ts`, asset inventory in `src/` and `static/`.

## Findings By Engine

### WebKit (Safari / iOS Safari)

#### 1) Dynamic viewport units + root scroll lock can break sizing/scroll on iOS
- Severity: High
- Risk flags: `layout-break`, `scroll-trap`, `ios-toolbar-viewport`
- Location:
  - `src/app.css:126-130`
  - `src/routes/+page.svelte:46,61,66`
  - `src/routes/about/+page.svelte:31,33`
  - `src/lib/components/menu.svelte:36,122`
  - `src/lib/components/canvas.svelte:773,854-865`
  - `src/lib/components/gradient.svelte:18`
- Evidence excerpt:
  - `@apply h-dvh w-dvw overflow-hidden overscroll-none ...`
  - repeated `h-dvh w-dvw` on fixed/fullscreen layers.
- Risk:
  - iOS Safari toolbar/viewport changes can cause clipped content, jumpy layouts, and nested scroll problems when `html/body` are locked and scrolling is delegated to inner containers.
- Mitigation for follow-up agent:
  - Add layered fallbacks: `min-height: 100vh; min-height: 100dvh;`.
  - Prefer `min-h-*` on page wrappers over hard locking `html/body`.
  - Keep one primary scroll container and add `-webkit-overflow-scrolling: touch` where nested scroll is required.
  - Keep `dvh` as enhancement, not the only sizing primitive.

#### 2) `MediaQueryList.addEventListener('change')` is not backward-safe for older Safari
- Severity: High
- Risk flags: `runtime-error`, `feature-detection-missing`
- Location: `src/lib/components/cursor_pill.svelte:53-65`
- Evidence excerpt:
  - `coarsePointerQuery.addEventListener('change', updatePointerType);`
- Risk:
  - Older Safari versions support `addListener/removeListener` but not `addEventListener` on `MediaQueryList`; this can throw and break cursor-pill behavior initialization.
- Mitigation for follow-up agent:
  - Feature-detect and fallback:
    - if `addEventListener` exists, use it.
    - else use `addListener/removeListener`.

#### 3) Pointer-centric interactions lack explicit touch/mouse fallback paths
- Severity: Medium
- Risk flags: `input-compat`, `degraded-interaction`
- Location:
  - `src/lib/components/cursor_pill.svelte:70-75`
  - `src/lib/components/canvas.svelte:528-540,769,811-812`
- Evidence excerpt:
  - `<svelte:window onpointermove=... onpointerover=... onpointerout=... />`
  - `onmouseover/onmouseout` used for cover interactions.
- Risk:
  - Older iOS/WebKit environments and some atypical input stacks may not fully match pointer/hover assumptions.
- Mitigation for follow-up agent:
  - Add progressive enhancement checks for pointer support.
  - Provide `mousemove`/`touchmove` or click-only fallback where behavior is essential.

#### 4) Backdrop blur effects without explicit fallback can reduce readability
- Severity: Medium
- Risk flags: `visual-degradation`, `filter-support`
- Location:
  - `src/lib/components/cursor_pill.svelte:81`
  - `src/lib/components/footer.svelte:12`
- Evidence excerpt:
  - `backdrop-blur` on translucent surfaces.
- Risk:
  - On engines/devices where `backdrop-filter` is unavailable/slow, overlays may look flat or have poor contrast.
- Mitigation for follow-up agent:
  - Add opaque/semi-opaque fallback backgrounds.
  - Gate blur styles with `@supports (backdrop-filter: blur(1px))`.

### Non-WebKit (Firefox / Chromium family, including older-device variants)

#### 5) No explicit legacy browser target/polyfill strategy
- Severity: High
- Risk flags: `build-target-gap`, `older-browser-break`
- Location:
  - `package.json:26-45` (no legacy plugin/browserslist)
  - `vite.config.ts:1-48` (no legacy compatibility plugin)
  - `tsconfig.json:2-14` (`moduleResolution: bundler`, no explicit downlevel target here)
- Evidence excerpt:
  - Vite + modern Svelte/Tailwind stack with no declared legacy bundle path.
- Risk:
  - Older Firefox/Chromium builds may fail on modern syntax/API assumptions without polyfills/transforms.
- Mitigation for follow-up agent:
  - Define supported browser matrix explicitly.
  - Add `browserslist`.
  - Add legacy transpilation/polyfill strategy (for example, legacy plugin or equivalent build split).

#### 6) `text-wrap-style` and Tailwind `text-wrap`/`text-nowrap` are not uniformly supported on older non-Chromium engines
- Severity: Medium
- Risk flags: `typography-variance`, `text-overflow`
- Location:
  - `src/app.css:157`
  - `src/lib/components/menu.svelte:67`
  - `src/lib/components/cursor_pill.svelte:81`
- Evidence excerpt:
  - `text-wrap-style: pretty;`
  - `text-wrap`, `text-nowrap`.
- Risk:
  - Browsers that ignore these properties will produce different wrapping/line breaks and can alter measured element size.
- Mitigation for follow-up agent:
  - Add robust fallback (`white-space`, `overflow-wrap`, `word-break`) before/alongside these declarations.
  - Treat advanced text wrapping as enhancement.

#### 7) `overflow-clip` utility usage can degrade to different overflow behavior on older browsers
- Severity: Medium
- Risk flags: `overflow-behavior-drift`, `sizing-variance`
- Location:
  - `src/lib/components/canvas.svelte:813,828`
  - `src/lib/components/header.svelte:18`
- Evidence excerpt:
  - `overflow-clip` on key layout/interactive nodes.
- Risk:
  - Unsupported engines fall back differently than expected (`visible`/`hidden` behavior mismatch), affecting clipping and hit areas.
- Mitigation for follow-up agent:
  - Provide `overflow-hidden` fallback before `overflow-clip`.
  - Use `@supports (overflow: clip)` for enhancement.

### Shared (WebKit + Non-WebKit)

#### 8) Clipboard API usage lacks guard/fallback
- Severity: Medium
- Risk flags: `api-support-gap`, `user-action-failure`
- Location:
  - `src/lib/stores.ts:156-164`
  - call sites: `src/routes/+page.svelte:50-51,76-77,88-89,103-104`, `src/routes/about/+page.svelte:43-44,55-56`
- Evidence excerpt:
  - `navigator.clipboard.writeText(t);` with no feature detection/catch.
- Risk:
  - Unsupported contexts (or restricted permissions) fail copy interaction and can raise runtime errors.
- Mitigation for follow-up agent:
  - Guard `navigator.clipboard?.writeText`.
  - Handle rejected promises.
  - Provide fallback path (`execCommand('copy')` or manual-select UX).

#### 9) Font compatibility is modern-only (`woff2` only)
- Severity: Low
- Risk flags: `font-fallback-gap`, `very-old-browser-risk`
- Location: `src/app.css:1-47`
- Evidence excerpt:
  - all `@font-face` sources are `format('woff2')`.
- Risk:
  - Very old browsers lacking WOFF2 support will fall back to system fonts, causing metric/layout shifts.
- Mitigation for follow-up agent:
  - Add `woff` fallback sources if older browsers are in scope.

## Tailwind/CSS Sizing Audit (Browser-Specific)

### High-impact utilities observed
- `h-dvh`, `w-dvw`, `min-h-dvh` (`src/app.css:126,130,165`, multiple Svelte files): modern viewport units; require fallback for older/quirky viewport implementations.
- `overflow-clip` (`src/lib/components/canvas.svelte:813,828`, `src/lib/components/header.svelte:18`): provide `overflow-hidden` fallback.
- `text-wrap`, `text-nowrap`, `text-wrap-style: pretty` (`src/lib/components/menu.svelte:67`, `src/lib/components/cursor_pill.svelte:81`, `src/app.css:157`): add conservative text wrapping fallbacks.
- `backdrop-blur` (`src/lib/components/cursor_pill.svelte:81`, `src/lib/components/footer.svelte:12`): feature-query and opaque fallback.

### Browser sizing guidance to apply in follow-up
- For full-height sections, prefer layered declarations: `100vh` fallback + `100dvh` enhancement.
- Avoid forcing both `html` and `body` to fixed dynamic viewport sizes when inner containers must scroll.
- Validate width behavior when using `dvw` on desktop where scrollbar presence changes viewport math.

## Media Format Audit
- Asset inventory (`src/` + `static/`):
  - `471` `.jpg`, `10` `.png`, `3` `.pdf`, `12` `.woff2`, no runtime video/audio assets detected.
- Compatibility outcome:
  - Images (`jpg/png`) are broadly compatible.
  - No codec fallback burden for video/audio in current code.
  - Font stack is modern-first because only `woff2` is provided.

## Recommended Compatibility Test Plan

### Priority matrix
- P0:
  - iOS Safari (latest + one older major) on real iPhone.
  - macOS Safari latest.
  - Firefox latest desktop.
- P1:
  - Chrome latest desktop + Android Chrome.
  - Edge latest desktop.
- P2:
  - Firefox ESR (or one older Firefox major) for overflow/text-wrap variance checks.

### Must-test flows
- `/` (home canvas):
  - viewport height correctness during URL bar show/hide and orientation change.
  - scrollability with locked root and inner scroll containers.
  - hover/cursor behavior fallback on touch/coarse pointer devices.
- `/about`:
  - full-height content visibility and scroll on iOS Safari.
  - email copy interactions.
- `/editions/[slug]`:
  - menu overlay sizing (`h-dvh/w-dvw`) and background click-close behavior.
  - reader/gallery image sizing and clipping with `overflow-clip`/`object-fit`.

### Functional checks tied to findings
- Clipboard actions:
  - verify success and no console errors when copy API is unavailable/restricted.
- Text wrapping:
  - compare label wrapping and tooltip sizing across Safari/Firefox/Chrome.
- Visual effects:
  - confirm readable fallback when `backdrop-filter` is unsupported/disabled.

## Notes
- No Playwright cross-browser suite/config was found in repository files inspected.
- Current project appears optimized for modern evergreen browsers unless a legacy target policy is added.
