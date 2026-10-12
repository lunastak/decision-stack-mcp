/**
 * Smoke test against a real environment — whichever LUNASTAK_API_URL / LUNASTAK_API_KEY
 * (/ LUNASTAK_VERCEL_BYPASS) point at.
 *
 *   npm run smoke                     list, read the first project with a stack, no-op edit
 *   npm run smoke -- <projectId>      the same against that project
 *
 * The edit sets the vision to itself, so it only adds a version-list entry
 * ("smoke test: no-op edit"). (15-74, 2026-10-12)
 */
import { createClient, LunastakApiError } from '../src/client.js'
import { loadConfig, VERSION } from '../src/config.js'

type Project = { id: string; name: string; hasStack: boolean }
type Stack = { vision: { text: string; updatedAt: string } }

const args = process.argv.slice(2)
const projectArg = args[0]

const config = loadConfig()
const api = createClient(config)
const show = (label: string, value: unknown) => console.log(`\n== ${label}\n${JSON.stringify(value, null, 2)}`)

try {
  console.log(`lunastak-mcp ${VERSION} smoke → ${config.baseUrl}`)

  const { projects } = (await api.listProjects()) as { projects: Project[] }
  show('list_projects', projects)

  const project = projectArg ? projects.find(p => p.id === projectArg) : projects.find(p => p.hasStack)
  if (!project) throw new Error(projectArg ? `Project ${projectArg} isn't in the list` : 'No project with a stack')

  const stack = (await api.getStack(project.id)) as Stack
  show(`get_stack ${project.name}`, stack)

  show('edit_stack (no-op)', await api.editStack(project.id, {
    summary: 'smoke test: no-op edit',
    operations: [{ op: 'set_statement', field: 'vision', text: stack.vision.text, expectedUpdatedAt: stack.vision.updatedAt }],
  }))

  console.log('\nsmoke: ok')
} catch (e) {
  if (e instanceof LunastakApiError) console.error(`\nsmoke: FAILED ${e.status} ${e.code}: ${e.message}`, e.details ?? '')
  else console.error('\nsmoke: FAILED', e)
  process.exit(1)
}
