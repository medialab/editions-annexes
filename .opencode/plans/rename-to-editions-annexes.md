# Plan: Rename annexes-website to editions-annexes

## Objective

Update all references from `annexes-website` to `editions-annexes` throughout the codebase, including canonical links, OG tags, package name, and deployment configuration.

## Files to Modify

### 1. src/routes/+layout.svelte

**Changes:**

- Line 39: Update canonical link to `https://medialab.github.io/editions-annexes/`
- Line 43: Hardcode og:url as `https://medialab.github.io/editions-annexes/` (static environment)
- Line 49: Update og:image to `https://medialab.github.io/editions-annexes/og_image.png`
- Line 55: Hardcode twitter:url as `https://medialab.github.io/editions-annexes/` (static environment)
- Line 61: Update twitter:image to `https://medialab.github.io/editions-annexes/og_image.png`

### 2. src/routes/editions/[slug]/+page.svelte

**Changes:**

- Line 35: Update og:image to `https://medialab.github.io/editions-annexes/og_image.png`
- Line 40: Update twitter:image to `https://medialab.github.io/editions-annexes/og_image.png`
- Note: og:url and twitter:url can remain dynamic with `{page.url.href}` as these are client-side rendered

### 3. package.json

**Changes:**

- Line 2: Change `"name": "annexes-website"` to `"name": "editions-annexes"`

### 4. .github/workflows/deploy.yml

**Changes:**

- Line 65: Change `BASE_PATH: /annexes-website` to `BASE_PATH: /editions-annexes`

### 5. README.md

**Changes:**

- Line 1: Update badge URLs from `medialab/annexes-website` to `medialab/editions-annexes`

## Files NOT to Modify

- `.git/*` (internal git references)
- `bun.lock` (generated file)

## Verification Steps

After execution:

1. Build should complete without errors
2. Deploy workflow should use new BASE_PATH
3. OG/Twitter meta tags should have correct hardcoded URLs
4. Package name should be updated

## Impact

- SEO: Canonical link and social sharing images will point to correct URLs
- Deployment: GitHub Pages will deploy to `/editions-annexes` path
- Package: npm package name will be updated
