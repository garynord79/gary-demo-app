# Architecture

## Stack
- Next.js App Router on React 19
- pnpm-managed single-package workspace
- Biome for formatting/linting
- Vitest for unit/integration tests
- Playwright for end-to-end tests
- tRPC v11 with routers under `lib/trpc`
- TanStack Query client/provider integration for React data access
- Drizzle ORM targeting PostgreSQL with a Neon placeholder connection
- Blob storage abstraction via `BlobStorageAdapter` and `VercelBlobAdapter` stub
- shadcn/ui-compatible component setup with Tailwind CSS v4 tokens
- Theme switching with `next-themes` supporting light/dark/system

## Layout
- `app/` App Router entrypoints, API routes, and providers
- `components/` shared UI primitives and app-facing components
- `lib/trpc/` server init, root router, and React client wiring
- `lib/db/` schema and database client bootstrap
- `lib/storage/` storage abstraction layer
- `test/unit/` fast isolated tests
- `test/integration/` cross-module tests without browser automation
- `test/e2e/` Playwright browser tests

## Data Flow
1. React client uses `trpc` hooks from `lib/trpc/client.ts`.
2. `QueryProvider` supplies a shared TanStack Query client and tRPC provider.
3. Requests hit `app/api/trpc/[trpc]/route.ts`.
4. Route delegates to `appRouter` built from procedures in `lib/trpc/router.ts`.
5. Database access goes through `lib/db/index.ts` and Drizzle schema in `lib/db/schema.ts`.

## Theming
Brand tokens are defined in `app/globals.css`:
- Primary: `#8DB434`
- Brand: `#1E2F7B`

Theme state is handled by `next-themes` with `system` as default.

## Notes
- The scaffold is aligned with Next.js 16 and React 19.
- `lib/db/index.ts` intentionally uses a Neon placeholder until a real PostgreSQL endpoint is configured.
- Azure Database for PostgreSQL and workload identity integration are left as TODOs in the DB bootstrap file.
- `components.json` is included so `shadcn/ui` components can be added later without reinitializing the project.
