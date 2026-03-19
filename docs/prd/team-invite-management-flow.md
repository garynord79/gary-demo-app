# PRD: Team invite management flow

## Summary
Build an admin-facing invite workflow where an administrator can invite users to join a team by email, track invite status, resend pending invites, and revoke invites before acceptance.

## Goals
- Demonstrate a realistic admin workflow in the starter app.
- Show schema design for invite lifecycle state.
- Show tRPC mutations with validation and status transitions.
- Show UI patterns for tables/forms/actions.
- Include unit/integration and E2E coverage.

## Non-goals
- Real email delivery integration.
- Full authentication and RBAC.
- Actual invite acceptance via emailed magic link.
- Multiple organizations or complex team roles.

## Users
- A demo admin managing invited teammates.
- Developers evaluating an end-to-end feature slice.

## Functional requirements
1. An invite has: `id`, `email`, `role`, `status`, `token`, `expiresAt`, `createdAt`, `updatedAt`.
2. Status values: `pending`, `accepted`, `revoked`, `expired`.
3. Admin can create an invite by entering email and selecting a role.
4. Duplicate active invites for the same email should be prevented.
5. Admin can list invites sorted by newest first.
6. Admin can filter invites by status.
7. Admin can resend a pending invite, which refreshes `updatedAt` and may rotate token / expiry.
8. Admin can revoke a pending invite.
9. Expired invites should be recognizable in API and UI.
10. The UI should clearly show status, expiry, and available actions.

## UX outline
- Add an admin invite management page or primary section.
- Layout includes:
  - invite form
  - invite list/table
  - status filter
  - per-row actions for resend and revoke when allowed
- Show inline validation and user-friendly empty states.

## Data model
- `team_invites`
- Optional role enum/text field depending on current project conventions

## API outline
Suggested tRPC procedures:
- `invites.list({ status?: string })`
- `invites.create({ email, role })`
- `invites.resend({ id })`
- `invites.revoke({ id })`

## Validation
- `email`: valid, normalized email
- `role`: constrained to small demo-safe set such as `member` and `admin`
- Only pending, non-expired invites can be resent or revoked

## Testing requirements
- Vitest coverage for validation and lifecycle transitions.
- Playwright flow for create/filter/resend/revoke behavior.

## Acceptance criteria
- Admin can create an invite from the UI.
- Duplicate pending invites are blocked.
- Invite list and status filtering work correctly.
- Resend and revoke update status and timestamps as expected.
- Tests cover the main workflow.
