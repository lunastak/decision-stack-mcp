#!/usr/bin/env node
/**
 * stdio MCP server over Lunastak's /api/v1. stdout is the protocol: log to stderr only.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createClient } from './client.js'
import { loadConfig, VERSION } from './config.js'
import { registerTools } from './tools.js'

let config
try {
  config = loadConfig()
} catch (e) {
  console.error(`lunastak MCP: ${(e as Error).message}`)
  process.exit(1)
}

const server = new McpServer({ name: 'lunastak', version: VERSION })
registerTools(server, createClient(config), { version: VERSION })
await server.connect(new StdioServerTransport())
console.error(`lunastak MCP ${VERSION} → ${config.baseUrl}`)
