/**
 * The three tools. Each is a thin call through the /api/v1 client; the descriptions are the agent's
 * instructions, so they carry the rules (read first, batch edits, write a summary).
 *
 * No import tool. Bundles write ground truths directly, but ground truths are pipeline output, not
 * something an agent should author, and a bundle has no source text behind it. Import comes back
 * redesigned, probably as a thin wrapper with auth and project selection or creation.
 * (Jonny, 15-74, 2026-10-12)
 */
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { LunastakApiError, type Client } from './client.js'
import { Operation } from './schema.js'

const projectId = z.string().min(1).describe('From list_projects')

function ok(result: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
}

export function explain(e: unknown): string {
  if (!(e instanceof LunastakApiError)) return `Could not reach Lunastak: ${e instanceof Error ? e.message : String(e)}`
  if (e.code === 'conflict') {
    const stale = (e.details as { stale?: unknown } | undefined)?.stale
    const which = stale === undefined ? '' : ` (stale: ${JSON.stringify(stale)})`
    return `The stack changed since you read it${which}. Call get_stack, then redo the edit against the fresh version.`
  }
  if (e.code === 'unauthorized') {
    return 'Lunastak rejected the API key. Check LUNASTAK_API_KEY (mint one with `npm run api-key -- mint` in the app repo).'
  }
  return `${e.code}: ${e.message}`
}

async function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return ok(await fn())
  } catch (e) {
    return { isError: true, content: [{ type: 'text', text: explain(e) }] }
  }
}

const EDIT_STACK = `Edit the user's Decision Stack as one changeset.

Rules:
- Call get_stack first. Pass each card's or statement's updatedAt as expectedUpdatedAt on every op that touches it; if anything changed since you read it, the whole changeset is refused and nothing is written.
- Batch EVERY change for one piece of work into a single call. Each call creates one entry in the user's version history, so ten calls for one rewrite is ten entries.
- summary is shown to the user in the version list. Write one plain sentence about what changed (e.g. "Tightened the vision and merged two overlapping objectives").

Operations (applied in order, 1–50 per call):
- set_statement: { field: "vision" | "strategy", text?, elaboration? } — at least one of text/elaboration; elaboration null clears it.
- add_card: { type, content } — appends; the componentId is minted by Lunastak. Use reorder to place it.
- update_card: { type, componentId, fields } — fields are merged into the card; supply only what changes.
- archive_card: { type, componentId } — archiving an objective also unlinks it from every opportunity.
- reorder: { type, componentIds } — must list exactly the active cards of that type, in the new order.

Editable fields per card type:
- objective: title, objective (the statement), explanation, omtm, aspiration, supportingMetrics[] (add requires title + objective)
- opportunity: title, description, objectiveIds[], successMetrics[] ({ belief: { action, outcome }, signal, baseline, target, objectiveId? }), status: draft | active | complete (add requires title + description)
- principle: priority, deprioritized ("even over" — what it is chosen over), context (add requires priority + deprioritized)`

export function registerTools(server: McpServer, api: Client) {
  server.registerTool('list_projects', {
    title: 'List Lunastak projects',
    description: "The user's Lunastak projects (id, name, hasStack, updatedAt). Call this first to get a projectId.",
    inputSchema: {},
  }, () => run(() => api.listProjects()))

  server.registerTool('get_stack', {
    title: 'Read a Decision Stack',
    description: 'The full Decision Stack of a project: vision and strategy (with elaborations), then objectives, opportunities and principles in order. Every card carries its componentId and updatedAt. Always read the stack before editing it, and use it as context for any work about the business.',
    inputSchema: { projectId },
  }, ({ projectId }) => run(() => api.getStack(projectId)))

  server.registerTool('edit_stack', {
    title: 'Edit a Decision Stack',
    description: EDIT_STACK,
    inputSchema: {
      projectId,
      summary: z.string().trim().min(1).max(300).describe('One plain sentence about what changed; shown in the version list'),
      operations: z.array(Operation).min(1).max(50),
    },
  }, ({ projectId, summary, operations }) => run(() => api.editStack(projectId, { summary, operations })))
}
