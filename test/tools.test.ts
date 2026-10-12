import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { registerTools } from '../src/tools.js'
import { LunastakApiError, type Client } from '../src/client.js'

function fakeApi() {
  return {
    listProjects: vi.fn(async () => ({ projects: [{ id: 'p1', name: 'Humventures', hasStack: true }] })),
    getStack: vi.fn(async () => ({ project: { id: 'p1' } })),
    editStack: vi.fn(async () => ({ applied: 1, snapshotVersion: 7 })),
  } satisfies Record<keyof Client, unknown>
}

let api: ReturnType<typeof fakeApi>
let mcp: McpClient

beforeEach(async () => {
  api = fakeApi()
  const server = new McpServer({ name: 'lunastak', version: '2.0.0-poc.0' })
  registerTools(server, api as unknown as Client)
  const [serverSide, clientSide] = InMemoryTransport.createLinkedPair()
  mcp = new McpClient({ name: 'test', version: '0' })
  await Promise.all([server.connect(serverSide), mcp.connect(clientSide)])
})

const text = (r: Awaited<ReturnType<McpClient['callTool']>>) =>
  (r.content as { type: string; text: string }[])[0].text

describe('tools', () => {
  it('registers the three tools, and no import', async () => {
    const { tools } = await mcp.listTools()
    expect(tools.map(t => t.name).sort()).toEqual(['edit_stack', 'get_stack', 'list_projects'])
  })

  it('list_projects calls listProjects and returns its JSON', async () => {
    const r = await mcp.callTool({ name: 'list_projects', arguments: {} })
    expect(api.listProjects).toHaveBeenCalledOnce()
    expect(JSON.parse(text(r))).toEqual({ projects: [{ id: 'p1', name: 'Humventures', hasStack: true }] })
  })

  it('get_stack calls getStack with the project id', async () => {
    await mcp.callTool({ name: 'get_stack', arguments: { projectId: 'p1' } })
    expect(api.getStack).toHaveBeenCalledWith('p1')
  })

  it('edit_stack sends the summary and operations as one changeset', async () => {
    const operations = [
      { op: 'set_statement', field: 'vision', text: 'A sharper vision', expectedUpdatedAt: '2026-10-12T00:00:00.000Z' },
      { op: 'update_card', type: 'objective', componentId: 'obj-1', fields: { title: 'Win mid-market' } },
    ]
    const r = await mcp.callTool({ name: 'edit_stack', arguments: { projectId: 'p1', summary: 'Tightened the vision', operations } })
    expect(r.isError).toBeFalsy()
    expect(api.editStack).toHaveBeenCalledWith('p1', { summary: 'Tightened the vision', operations })
  })

  it('edit_stack rejects an unknown card field before calling the API', async () => {
    const r = await mcp.callTool({
      name: 'edit_stack',
      arguments: { projectId: 'p1', summary: 's', operations: [{ op: 'update_card', type: 'principle', componentId: 'prin-1', fields: { title: 'x' } }] },
    })
    expect(r.isError).toBe(true)
    expect(api.editStack).not.toHaveBeenCalled()
  })

  it('a conflict becomes isError with the get_stack hint', async () => {
    api.editStack.mockRejectedValueOnce(new LunastakApiError(409, 'conflict', 'The stack changed since it was read', { stale: ['obj-1'] }))
    const r = await mcp.callTool({
      name: 'edit_stack',
      arguments: { projectId: 'p1', summary: 's', operations: [{ op: 'archive_card', type: 'objective', componentId: 'obj-1' }] },
    })
    expect(r.isError).toBe(true)
    expect(text(r)).toContain('obj-1')
    expect(text(r)).toMatch(/Call get_stack/)
  })

  it('an unauthorized error points at LUNASTAK_API_KEY', async () => {
    api.listProjects.mockRejectedValueOnce(new LunastakApiError(401, 'unauthorized', 'Invalid API key'))
    const r = await mcp.callTool({ name: 'list_projects', arguments: {} })
    expect(r.isError).toBe(true)
    expect(text(r)).toContain('LUNASTAK_API_KEY')
  })

  it('other API errors surface as code: message', async () => {
    api.getStack.mockRejectedValueOnce(new LunastakApiError(404, 'not_found', 'No Decision Stack yet'))
    const r = await mcp.callTool({ name: 'get_stack', arguments: { projectId: 'p1' } })
    expect(r.isError).toBe(true)
    expect(text(r)).toBe('not_found: No Decision Stack yet')
  })
})
