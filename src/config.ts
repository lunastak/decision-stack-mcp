import { readFileSync } from 'node:fs'
import type { ClientConfig } from './client.js'

/** From package.json, read relative to this file so it works from src/ (tsx) and dist/ alike. */
export const VERSION: string = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Omit<ClientConfig, 'fetchImpl'> {
  const apiKey = env.LUNASTAK_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('LUNASTAK_API_KEY is not set. Add it to the MCP config: claude mcp add … --env LUNASTAK_API_KEY=lsk_…')
  }
  return {
    apiKey,
    baseUrl: env.LUNASTAK_API_URL?.trim() || 'https://app.lunastak.io',
    vercelBypass: env.LUNASTAK_VERCEL_BYPASS?.trim() || undefined,
  }
}
