# PRD: Notes app with tags and search

## Summary
Build a lightweight notes feature in the existing Next.js + tRPC + Drizzle starter. Users can create, edit, list, and delete notes, organize them with tags, and quickly find notes with text search and tag filters.

## Goals
- Demonstrate a realistic full-stack CRUD feature in the starter app.
- Show Drizzle schema design with a many-to-many relationship.
- Show tRPC query and mutation patterns.
- Show a useful UI with filtering and basic empty/loading states.
- Include unit/integration and E2E coverage.

## Non-goals
- Rich text editing.
- User authentication or per-user isolation.
- Sharing, attachments, or offline sync.
- Advanced full-text search indexing.

## Users
- A single demo user exploring the starter app.
- Developers evaluating the stack and GitHub Copilot / coding-agent workflows.

## Functional requirements
1. A note has: `id`, `title`, `content`, `createdAt`, `updatedAt`.
2. A tag has: `id`, `name`, `createdAt`.
3. Notes can be associated with zero or more tags.
4. Users can create a note with title, content, and selected or newly entered tags.
5. Users can edit a note’s title, content, and tags.
6. Users can delete a note.
7. Users can list notes sorted by most recently updated first.
8. Users can search notes by title or content using case-insensitive partial matching.
9. Users can filter notes by one or more tags.
10. The UI should show sensible empty states, loading states, and validation feedback.

## UX outline
- Add a notes page or primary home-screen section for the feature.
- Layout includes:
  - note list
  - search input
  - tag filter controls
  - create/edit note form
- Each note card shows title, truncated content preview, tags, and updated timestamp.
- Creating or editing should update the list without a full page refresh.

## Data model
- `notes`
- `tags`
- `note_tags` join table

## API outline
Suggested tRPC procedures:
- `notes.list({ query?: string, tagIds?: string[] })`
- `notes.create({ title, content, tags })`
- `notes.update({ id, title, content, tags })`
- `notes.delete({ id })`
- `tags.list()`

## Validation
- `title`: required, trimmed, 1-120 chars
- `content`: optional, max reasonable demo length
- `tag name`: required, trimmed, unique case-insensitively in app behavior

## Testing requirements
- Vitest coverage for router behavior and validation.
- Playwright flow for create/search/filter/edit/delete happy path.

## Acceptance criteria
- A developer can run migrations and use the notes feature locally.
- Search returns matching notes by title or content.
- Tag filters limit visible notes correctly.
- Create/edit/delete flows work through tRPC.
- Tests cover the main feature path.
