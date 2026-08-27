# Development

## Prerequisites

- Node.js version specified in [`.node-version`](.node-version)
- Corepack-enabled pnpm, pinned by `packageManager` in [`package.json`](package.json)

Enable Corepack before the first install if it is not already enabled:

```sh
corepack enable
```

## Local workflow

Install dependencies and start the development server:

```sh
pnpm install
pnpm dev
```

Create and preview a production build:

```sh
pnpm build
pnpm preview
```

Format the project with:

```sh
pnpm fmt
```

## Content pipeline

Challenge content is built from the official Lodash `4.18.1` release, installed as the
`lodash-source` GitHub tag dependency:

- `lodash.js` JSDoc is rendered with Lodash's docdown pipeline for documentation display.
- `lodash.js` JSDoc is also parsed for challenge metadata, starter code, aliases, and examples.
- `test/test.js` provides the official QUnit test module mapping. Shared method groups are inferred
  from the official module titles and parameterized method-name expressions without a handwritten
  override table.

Astro's content loader builds the problem collection directly from those installed sources during
content sync. The browser runner imports the same pinned Lodash source package.

## Architecture

- `scripts/lib/main/` adapts the pinned Lodash sources into challenge content during Astro's content
  sync.
- `src/domain/` owns framework-independent challenge and runner contracts.
- `src/pages/` and `src/components/` render the static documentation and challenge interface.
- Each submission runs in a fresh worker. Example evaluation and official QUnit compatibility are
  separate runner adapters.
- Browser progress storage keeps both accepted problem IDs and their accepted solutions for later
  review.

## Testing notes

- Hidden tests reuse Lodash's official test suite as the source of truth.
- Runtime checks execute in a browser worker and terminate on timeout.
- The project does not include Playwright.

## Deployment

The site intentionally supports deployment at the root of an origin. Hosting it below a path prefix
is outside the deployment contract.

Every hosting target uses the same static build:

```text
Build command: pnpm build
Output directory: dist
```

GitHub Actions owns the build and future deployment process. The build workflow verifies the
production build and publishes `dist/` as a platform-neutral artifact. Future Cloudflare and Vercel
deployment jobs should keep provider credentials and target-specific settings in GitHub environments
and secrets rather than application code.
