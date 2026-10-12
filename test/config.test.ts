import { describe, it, expect } from 'vitest'
import { loadConfig, VERSION } from '../src/config.js'

describe('loadConfig', () => {
  it('fails clearly without LUNASTAK_API_KEY', () => {
    expect(() => loadConfig({})).toThrow(/LUNASTAK_API_KEY/)
  })

  it('defaults the URL to production and leaves the bypass unset', () => {
    expect(loadConfig({ LUNASTAK_API_KEY: 'lsk_x' })).toEqual({ apiKey: 'lsk_x', baseUrl: 'https://app.lunastak.io', vercelBypass: undefined })
  })

  it('reads the URL and the preview bypass', () => {
    expect(loadConfig({ LUNASTAK_API_KEY: 'k', LUNASTAK_API_URL: 'http://localhost:3000', LUNASTAK_VERCEL_BYPASS: 'b' }))
      .toEqual({ apiKey: 'k', baseUrl: 'http://localhost:3000', vercelBypass: 'b' })
  })
})

it('VERSION is the package version', () => {
  expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
})
