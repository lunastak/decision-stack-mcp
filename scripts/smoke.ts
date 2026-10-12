/**
 * Smoke test against a real environment — whichever LUNASTAK_API_URL / LUNASTAK_API_KEY
 * (/ LUNASTAK_VERCEL_BYPASS) point at.
 *
 *   npm run smoke                     list, read the first project with a stack, no-op edit
 *   npm run smoke -- <projectId>      the same against that project
 *   npm run smoke -- <projectId> --import   also import a one-chunk bundle (writes a ground truth)
 *
 * The edit sets the vision to itself, so it only adds a version-list entry
 * ("smoke test: no-op edit"). The import is opt-in because it isn't harmless. (15-74, 2026-10-12)
 */
import { createClient, LunastakApiError } from '../src/client.js'
import { loadConfig, VERSION } from '../src/config.js'
import { generatedBy } from '../src/tools.js'

type Project = { id: string; name: string; hasStack: boolean }
type Stack = { vision: { text: string; updatedAt: string } }

const args = process.argv.slice(2)
const doImport = args.includes('--import')
const projectArg = args.find(a => !a.startsWith('--'))

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

  if (doImport) {
    show('import_context', await api.importContext(project.id, {
      version: '1.0',
      framework: 'decision-stack',
      generatedBy: generatedBy(VERSION),
      preparedAt: new Date().toISOString(),
      chunks: [{ topic: 'Smoke test', content: 'A one-chunk bundle posted by the decision-stack MCP smoke script.' }],
    }))
  } else {
    console.log('\n== import_context skipped (pass --import; it writes a ground truth)')
  }
  console.log('\nsmoke: ok')
} catch (e) {
  if (e instanceof LunastakApiError) console.error(`\nsmoke: FAILED ${e.status} ${e.code}: ${e.message}`, e.details ?? '')
  else console.error('\nsmoke: FAILED', e)
  process.exit(1)
}
