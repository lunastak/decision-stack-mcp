/**
 * Request schemas for Lunastak's /api/v1.
 *
 * The changeset schema is HAND-COPIED from the app's `src/lib/api-v1/schemas.ts` (app repo,
 * lunastak/app.lunastak.io). Keep the two in step by hand. This is a Known Compromise in the app's
 * ARCHITECTURE.md — "MCP schemas are hand-copied from the app's v1 schemas"; revisit if v1 changes
 * more than once (publish the schemas as a package, or generate both from an OpenAPI spec).
 * (15-74, 2026-10-12)
 */
import { z } from 'zod'

const short = z.string().trim().min(1).max(200)
const long = z.string().trim().min(1).max(4000)
const componentId = z.string().min(1).max(100)

const successMetric = z.object({
  id: z.string().max(100).optional(),
  belief: z.object({ action: short, outcome: short }),
  signal: short, baseline: short, target: short,
  objectiveId: componentId.optional(),
}).strict()

export const CARD_FIELDS = {
  objective: z.object({
    title: short, objective: long, explanation: long, omtm: short, aspiration: short,
    supportingMetrics: z.array(short).max(5),
  }).strict(),
  opportunity: z.object({
    title: short, description: long, objectiveIds: z.array(componentId).max(20),
    successMetrics: z.array(successMetric).max(5), status: z.enum(['draft', 'active', 'complete']),
  }).strict(),
  principle: z.object({ priority: short, deprioritized: short, context: long }).strict(),
} as const

export const CARD_TYPES = ['objective', 'opportunity', 'principle'] as const
export type CardType = (typeof CARD_TYPES)[number]

/** Required on add; everything else optional. */
const NEW_CARD = {
  objective: CARD_FIELDS.objective.partial().required({ title: true, objective: true }),
  opportunity: CARD_FIELDS.opportunity.partial().required({ title: true, description: true }),
  principle: CARD_FIELDS.principle.partial().required({ priority: true, deprioritized: true }),
}

const expected = z.string().datetime().optional()

// A generic helper: `.refine` isn't callable on the per-type union that CARD_FIELDS[type] gives
// inside perType (TS2349), so the non-empty check goes through here.
const nonEmpty = <S extends z.ZodTypeAny>(s: S) => s.refine(f => Object.keys(f as object).length > 0, 'fields is empty')

const perType = <T extends CardType>(type: T) => [
  z.object({ op: z.literal('add_card'), type: z.literal(type), content: NEW_CARD[type] }).strict(),
  z.object({ op: z.literal('update_card'), type: z.literal(type), componentId, fields: nonEmpty(CARD_FIELDS[type].partial()), expectedUpdatedAt: expected }).strict(),
] as const

export const Operation = z.union([
  z.object({ op: z.literal('set_statement'), field: z.enum(['vision', 'strategy']), text: long.optional(), elaboration: z.string().max(4000).nullable().optional(), expectedUpdatedAt: expected }).strict()
    .refine(o => o.text !== undefined || o.elaboration !== undefined, 'set text or elaboration'),
  ...perType('objective'), ...perType('opportunity'), ...perType('principle'),
  z.object({ op: z.literal('archive_card'), type: z.enum(CARD_TYPES), componentId, expectedUpdatedAt: expected }).strict(),
  z.object({ op: z.literal('reorder'), type: z.enum(CARD_TYPES), componentIds: z.array(componentId).min(1).max(50) }).strict(),
])
export type StackOperation = z.infer<typeof Operation>

export const StackChangesBody = z.object({
  summary: z.string().trim().min(1).max(300),
  operations: z.array(Operation).min(1).max(50),
}).strict()
