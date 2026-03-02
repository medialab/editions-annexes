# Execution Plan: Option A - Full Static Rendering

## Goal

Enable proper static site generation (SSG) with prerendered HTML content for SEO and social sharing.

## Changes Required

### 1. svelte.config.js - Add prerender config + trailingSlash

**Current:**

```javascript
kit: {
  adapter: adapter(),
  paths: { base: process.env.BASE_PATH ?? '' }
}
```

**New:**

```javascript
kit: {
  adapter: adapter(),
  paths: { base: process.env.BASE_PATH ?? '' },
  prerender: {
    entries: ['*'],
    handleHttpError: ({ path, message }) => {
      // Log but don't fail build for non-critical errors
      console.warn(`Prerender error for ${path}: ${message}`);
      return 'warn';
    }
  },
  trailingSlash: 'always'
}
```

### 2. src/routes/+layout.ts - Remove ssr = false

**Current:**

```typescript
export const prerender = true;
export const ssr = false;
```

**New:**

```typescript
export const prerender = true;
```

### 3. src/routes/editions/[slug]/+page.svelte - Hardcode OG URL

**Current (lines 34, 37):**

```svelte
<meta property="og:url" content={page.url.href} />
<meta name="twitter:url" content={page.url.href} />
```

**New:**

```svelte
<meta
	property="og:url"
	content={`https://medialab.github.io/editions-annexes/editions/${data.correctEdition?.name || ''}/`}
/>
<meta
	name="twitter:url"
	content={`https://medialab.github.io/editions-annexes/editions/${data.correctEdition?.name || ''}/`}
/>
```

### 4. src/lib/components/canvas.svelte - Guard browser-only code

**Add import:**

```typescript
import { browser } from '$app/environment';
```

**Modify initializeScene (line ~330):**

```typescript
async function initializeScene() {
	if (!browser || !host) return; // Add browser check
	// ... rest of function
}
```

**Modify onMount callback (line ~722):**

```typescript
onMount(() => {
	if (!browser || !host) return; // Add browser check
	// ... rest of function
});
```

### 5. src/routes/+layout.svelte - Guard mobile detection

**Current onMount:**

```typescript
onMount(() => {
	const updateMobileStatus = () => {
		isMobile.set(DeviceInfo.isMobile || window.innerWidth < 768);
	};
	// ...
});
```

**New:**

```typescript
import { browser } from '$app/environment';

onMount(() => {
	if (!browser) return; // Add browser guard

	const updateMobileStatus = () => {
		isMobile.set(DeviceInfo.isMobile || window.innerWidth < 768);
	};
	// ...
});
```

### 6. src/routes/+page.svelte - Guard page ready state

**Add:**

```typescript
import { browser } from '$app/environment';
```

**Modify onMount:**

```typescript
onMount(() => {
	if (!browser) return; // Add browser guard
	setTimeout(() => {
		isPageReady = true;
	}, 400);
});
```

## Verification Steps

1. Run `npm run build` (should complete without errors)
2. Check `build/index.html` - should contain actual HTML content, not empty shell
3. Check `build/editions/[slug]/index.html` - should contain edition content
4. Verify OG meta tags are present in static HTML
5. Deploy to GitHub Pages and test:
   - View page source (should show content)
   - Facebook Debugger tool
   - Twitter Card Validator

## Risk Assessment

**Low Risk:**

- Adding `browser` guards (no-op on server, works on client)
- Hardcoding OG URLs (static values anyway)
- Removing `ssr = false` (enables proper behavior)

**Medium Risk:**

- `trailingSlash: 'always'` - Requires updating internal links if any use bare paths

**Mitigation:**

- Test build locally before deploying
- Keep original files backed up (git history)

## Rollback Plan

If issues occur:

1. Revert `+layout.ts` to add back `ssr = false`
2. Remove `browser` guards if they cause issues
3. Revert svelte.config.js changes

## Execution Order

1. Update svelte.config.js (config change)
2. Update +layout.ts (enable SSR)
3. Update edition [slug] page (hardcode OG URLs)
4. Add browser guards to canvas.svelte
5. Add browser guards to +layout.svelte
6. Add browser guards to +page.svelte
7. Build and verify
8. Deploy

Ready to execute this plan?
