# Ralph Loop Development Workflow

Ralph is the repo-level loop controller for moving work from open GitHub issues to merged pull requests with as little manual glue as possible.

## What Ralph Does

1. Picks the next eligible open GitHub issue.
2. Creates or resumes a branch dedicated to that issue.
3. Expects implementation work to be committed and pushed on that branch.
4. Creates or resumes the pull request for the branch.
5. Waits for CI feedback and review state.
6. Attempts merge when checks are green and branch rules allow it.
7. Updates `docs/context_summary.md` with the latest merged result.
8. Closes the finished issue and reports the next candidate issue.

The controller is intentionally conservative:

- It stops if the working tree is dirty.
- It skips issues labeled `blocked`.
- It stops when a PR has requested changes.
- It will not silently invent code changes for an issue; the implementation step still needs a coding agent or human.

## Script Location

- Controller: `scripts/ralph-loop.js`
- Context ledger: `docs/context_summary.md`
- CI workflow: `.github/workflows/ralph-loop.yml`

## Prerequisites

- `gh` CLI authenticated for the target repository.
- `git` remote `origin` pointing at `garynord79/gary-demo-app`.
- A clean working tree before running the controller.
- `pnpm` dependencies installed for local validation.

## Typical Loop

### 1. Start from the default branch

```bash
git checkout main
git pull --ff-only origin main
```

### 2. Let Ralph pick the next issue

```bash
node scripts/ralph-loop.js
```

If no open PR exists for the chosen issue, Ralph creates a branch and stops so implementation can happen safely.

### 3. Implement the issue on the Ralph branch

```bash
git status
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
git add .
git commit -m "feat: resolve issue #123"
git push -u origin <ralph-branch>
```

### 4. Re-run Ralph to drive PR, review, and merge

```bash
node scripts/ralph-loop.js --issue 123
```

At this stage Ralph will:

- locate the existing PR or create one,
- optionally request a reviewer,
- wait for PR checks to pass,
- attempt approval/merge where repo rules permit,
- update the context summary,
- close the issue,
- print the next issue to tackle.

## Useful Flags

```bash
node scripts/ralph-loop.js --issue 10
node scripts/ralph-loop.js --limit 50
node scripts/ralph-loop.js --base main
node scripts/ralph-loop.js --reviewer garynord79
node scripts/ralph-loop.js --merge squash
node scripts/ralph-loop.js --poll-seconds 30 --timeout-minutes 45
```

Environment variables also work:

- `RALPH_REVIEWER`
- `RALPH_MERGE_METHOD`
- `RALPH_POLL_SECONDS`
- `RALPH_TIMEOUT_MINUTES`

## GitHub Actions Validation

The `ralph-loop.yml` workflow runs on pull requests, pushes to `main`, and manual dispatch.

Validation includes:

- `pnpm lint` via Biome
- `pnpm test` via Vitest
- `pnpm test:e2e` via Playwright
- `pnpm build`

Manual dispatch can also request a Copilot review comment on a PR by posting `@copilot review` through the GitHub CLI.

## Recommended Human-in-the-Loop Rules

- Use Ralph for coordination, not blind autonomy.
- Read CI failures before re-running the loop.
- Treat `CHANGES_REQUESTED` as a hard stop until feedback is addressed.
- Keep `docs/context_summary.md` in the repo so the next session inherits the current state fast.
