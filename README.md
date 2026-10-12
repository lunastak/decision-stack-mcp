# Lunastak MCP (decision-stack-mcp)

A **proof-of-concept** MCP server that lets Claude Code work on a [Lunastak](https://lunastak.io)
Decision Stack directly: read it as context, and wordsmith and restructure its cards. It's a thin
client of Lunastak's token-authenticated `/api/v1`; the API is the product, and this is one client
of it.

Private use for now: it runs from a local clone and is **not published to npm**
(`"private": true`).

## What changed

This repo used to hold a prompt-only server: one `decision-stack` tool that returned the Decision
Stack skill instructions. It's published on npm as `decision-stack@1.1.0`, and that version stays
there untouched. Its source is tagged **`prompt-server-final`**
(`git checkout prompt-server-final`). For the skill itself, see the
[Lunastak tools plugin](https://github.com/lunastak/tools).

## Setup

You need a Lunastak API key (`lsk_…`). Keys are minted by Lunastak's CLI in the app repo
(`npm run api-key -- mint`) and shown once.

```bash
npm install && npm run build
claude mcp add --scope user lunastak \
  --env LUNASTAK_API_KEY=lsk_… \
  --env LUNASTAK_API_URL=https://app.lunastak.io \
  -- node /Users/Jonny/Dev/humventures/lunastak/decision-stack-mcp/dist/index.js
```

The key lives in the MCP config and never passes through the chat.

| Variable | | |
|---|---|---|
| `LUNASTAK_API_KEY` | required | The server exits at start without it |
| `LUNASTAK_API_URL` | default `https://app.lunastak.io` | `http://localhost:3000` for dev, or a preview's branch URL |
| `LUNASTAK_VERCEL_BYPASS` | optional | Previews sit behind Vercel SSO. Set this to the protection-bypass secret (1Password, Development vault) to reach a preview; it's sent as `x-vercel-protection-bypass` |

## Tools

| Tool | Route | |
|---|---|---|
| `list_projects` | `GET /api/v1/projects` | Your active projects. Use it first to get a `projectId` |
| `get_stack` | `GET /api/v1/projects/:id/stack` | Vision, strategy, objectives, opportunities and principles, each with its `componentId` and `updatedAt` |
| `edit_stack` | `POST /api/v1/projects/:id/stack/changes` | One **changeset** per piece of work: `set_statement`, `add_card`, `update_card`, `archive_card`, `reorder`. It's all-or-nothing, it's checked against `expectedUpdatedAt`, and it appears in the app's version list under its `summary` |

There's no import tool. Bundles write ground truths directly, but ground truths are the pipeline's
output, not something an agent should author. Import will come back redesigned. Until then, bundles
go in through the app's import dialog.

Errors come back as tool errors the agent can act on. A **409 conflict** means the stack changed
since it was read, so call `get_stack` and redo the edit. A **401** means the key was rejected, so
check `LUNASTAK_API_KEY`.

## Development

```bash
npm test          # vitest; the API client is faked, the MCP server and SDK client are real
npm run build     # tsc → dist/
npm run smoke     # against whatever LUNASTAK_API_URL / _KEY point at
```

`npm run smoke` lists projects, reads the first project that has a stack, and makes a no-op edit
that sets the vision to itself (summary "smoke test: no-op edit"). Pass a project id to target one.

The changeset schema in `src/schema.ts` is **hand-copied** from the app's
`src/lib/api-v1/schemas.ts`, so keep the two in step.

## License

MIT
