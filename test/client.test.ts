import { describe, it, expect, vi } from 'vitest'
import { createClient, LunastakApiError } from '../src/client.js'

function fakeFetch(status: number, body: unknown, { json = true } = {}) {
  return vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(json ? JSON.stringify(body) : String(body), { status }),
  )
}

describe('createClient', () => {
  it('sends the bearer key to <base>/api/v1, trimming a trailing slash', async () => {
    const fetchImpl = fakeFetch(200, { projects: [] })
    const client = createClient({ baseUrl: 'https://app.example.com/', apiKey: 'lsk_abc', fetchImpl })

    await client.listProjects()

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://app.example.com/api/v1/projects')
    expect(init?.method).toBe('GET')
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer lsk_abc')
  })

  it('posts a JSON body and encodes the project id', async () => {
    const fetchImpl = fakeFetch(200, { applied: 1 })
    const client = createClient({ baseUrl: 'https://x', apiKey: 'k', fetchImpl })

    await client.editStack('a/b', { summary: 's', operations: [] })

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://x/api/v1/projects/a%2Fb/stack/changes')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ summary: 's', operations: [] })
  })

  it('passes the import mode as a query parameter', async () => {
    const fetchImpl = fakeFetch(200, {})
    const client = createClient({ baseUrl: 'https://x', apiKey: 'k', fetchImpl })

    await client.importContext('p1', { version: '1.0' }, 'direct')

    expect(fetchImpl.mock.calls[0][0]).toBe('https://x/api/v1/projects/p1/bundles?mode=direct')
  })

  it('adds the Vercel bypass header only when configured', async () => {
    const without = fakeFetch(200, {})
    await createClient({ baseUrl: 'https://x', apiKey: 'k', fetchImpl: without }).listProjects()
    expect(without.mock.calls[0][1]?.headers).not.toHaveProperty('x-vercel-protection-bypass')

    const withBypass = fakeFetch(200, {})
    await createClient({ baseUrl: 'https://x', apiKey: 'k', vercelBypass: 'sekret', fetchImpl: withBypass }).listProjects()
    expect(withBypass.mock.calls[0][1]?.headers).toHaveProperty('x-vercel-protection-bypass', 'sekret')
  })

  it('throws LunastakApiError with the code and details on a 409', async () => {
    const fetchImpl = fakeFetch(409, {
      error: { code: 'conflict', message: 'The stack changed since it was read', details: { stale: ['obj-1'] } },
    })
    const client = createClient({ baseUrl: 'https://x', apiKey: 'k', fetchImpl })

    const err = await client.editStack('p1', {}).catch(e => e)

    expect(err).toBeInstanceOf(LunastakApiError)
    expect(err).toMatchObject({ status: 409, code: 'conflict', details: { stale: ['obj-1'] } })
    expect(err.message).toBe('The stack changed since it was read')
  })

  it('throws code internal on a non-JSON error', async () => {
    const fetchImpl = fakeFetch(502, '<html>Bad Gateway</html>', { json: false })
    const client = createClient({ baseUrl: 'https://x', apiKey: 'k', fetchImpl })

    const err = await client.listProjects().catch(e => e)

    expect(err).toBeInstanceOf(LunastakApiError)
    expect(err).toMatchObject({ status: 502, code: 'internal', message: 'HTTP 502' })
  })
})
