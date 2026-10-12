/**
 * Typed fetch over Lunastak's /api/v1. Base URL + bearer key; an error response becomes a
 * LunastakApiError carrying the v1 error code, so the tools can explain it to the agent.
 */

export class LunastakApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message)
    this.name = 'LunastakApiError'
  }
}

export interface ClientConfig {
  baseUrl: string
  apiKey: string
  /** Previews sit behind Vercel SSO; API calls to a branch URL need this header. */
  vercelBypass?: string
  fetchImpl?: typeof fetch
}

export function createClient({ baseUrl, apiKey, vercelBypass, fetchImpl = fetch }: ClientConfig) {
  const root = `${baseUrl.replace(/\/+$/, '')}/api/v1`

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }
    if (vercelBypass) headers['x-vercel-protection-bypass'] = vercelBypass
    const res = await fetchImpl(root + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const json = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null
    if (!res.ok) {
      throw new LunastakApiError(res.status, json?.error?.code ?? 'internal', json?.error?.message ?? `HTTP ${res.status}`, json?.error?.details)
    }
    return json as T
  }

  const p = (id: string) => `/projects/${encodeURIComponent(id)}`
  return {
    listProjects: () => call<{ projects: unknown[] }>('GET', '/projects'),
    getStack: (projectId: string) => call<unknown>('GET', `${p(projectId)}/stack`),
    editStack: (projectId: string, changes: unknown) => call<unknown>('POST', `${p(projectId)}/stack/changes`, changes),
  }
}

export type Client = ReturnType<typeof createClient>
