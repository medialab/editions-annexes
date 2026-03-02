# Static Rendering Issues Analysis

## Critical Issues Found

### 1. SSR Disabled (`ssr = false`)

**File:** `src/routes/+layout.ts`

- `ssr = false` + `prerender = true` = Empty HTML shells
- All content requires JavaScript to render
- SEO/social crawlers see blank pages

### 2. Dynamic Meta Tags Not Rendered

**File:** `src/routes/editions/[slug]/+page.svelte` Lines 34, 37

- `page.url.href` is runtime-only with SSR disabled
- OG/Twitter URLs won't appear in static HTML

### 3. Client-Side Initialization Only

- `$effect` for `currentEdition` (won't run during prerender)
- `onMount` for canvas, mobile detection, etc.
- All content hidden until JS executes

### 4. Missing Trailing Slash Config

- GitHub Pages requires trailing slashes
- Will cause 404s on page refresh

## Recommended Fixes

### Option A - Full Static (Better SEO)

```typescript
// +layout.ts - remove ssr = false
export const prerender = true;
// export const ssr = false;  // REMOVE THIS
```

Add to `svelte.config.js`:

```javascript
export default {
	kit: {
		adapter: adapter(),
		paths: { base: process.env.BASE_PATH ?? '' },
		prerender: {
			entries: ['*'],
			handleHttpError: 'warn'
		},
		trailingSlash: 'always'
	}
};
```

Guard browser-only code:

```typescript
import { browser } from '$app/environment';

$effect(() => {
	if (!browser) return;
	// browser-only logic here
});
```

### Option B - Embrace SPA

- Keep current architecture
- Add loading spinner/placeholder
- Accept limited SEO

## Files Requiring Changes

- `src/routes/+layout.ts` - Remove ssr = false
- `svelte.config.js` - Add trailingSlash, prerender config
- `src/routes/+layout.svelte` - Guard browser-only imports
- `src/lib/components/canvas.svelte` - Guard window/document usage
- `src/routes/editions/[slug]/+page.svelte` - Hardcode OG URLs

Which approach do you want to take?
