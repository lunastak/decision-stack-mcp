# Decision Stack MCP Server

An MCP server that brings the [Decision Stack](https://thedecisionstack.com) framework to MCP-compatible clients like Claude Code, Codex, and Gemini CLI.

## What it does

Exposes a `decision-stack` tool that guides you through organising your strategic thinking into a structured context bundle — ready to import into [Lunastak](https://lunastak.io) to generate your full Decision Stack (Vision, Strategy, Objectives, Principles, Opportunities).

Four modes:
- **Context dump** — share documents, get organised themes back
- **Strategic exploration** — guided Socratic questioning
- **Focused deep-dive** — go deep on one area
- **Gap analysis** — see what's covered and what's missing

## Install

### Claude Desktop

Add to your config file and restart Claude Desktop.

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "decision-stack": {
      "command": "npx",
      "args": ["-y", "decision-stack@latest"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add decision-stack -- npx -y decision-stack@latest
```

### Codex

```bash
codex --mcp-config '{"decision-stack":{"command":"npx","args":["-y","decision-stack@latest"]}}'
```

### Other MCP clients

Any MCP-compatible client can connect using:

```
command: npx
args: -y decision-stack@latest
```

## Usage

1. Start a conversation in your MCP client
2. The `decision-stack` tool will be available — invoke it or ask to "build my Decision Stack"
3. Choose a mode or upload your documents
4. Work through the session — the assistant extracts and organises your strategic context
5. When done, copy the JSON context bundle
6. Import into [Lunastak](https://lunastak.io) to generate your Decision Stack

## About

The Decision Stack framework is from [The Decision Stack](https://thedecisionstack.com) by Martin Eriksson. [Lunastak](https://lunastak.io) is an AI strategy coach that helps leaders build and maintain their Decision Stack.

Built by [Jonny Schneider](https://humventures.com.au) at [Lunastak](https://lunastak.io).

## License

MIT
