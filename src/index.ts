#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { INSTRUCTIONS } from "./instructions.js";

const server = new McpServer({
  name: "decision-stack",
  version: "1.0.2",
});

server.tool(
  "decision-stack",
  "Build your Decision Stack — organise strategic thinking into Vision, Strategy, Objectives, Principles, and Opportunities. Returns the full Decision Stack skill instructions for Claude to follow.",
  {
    mode: z
      .enum(["context_dump", "exploration", "deep_dive", "gap_analysis"])
      .optional()
      .describe(
        "Starting mode: context_dump, exploration, deep_dive, or gap_analysis"
      ),
  },
  ({ mode }) => {
    let content = INSTRUCTIONS;
    if (mode) {
      const modeNames: Record<string, string> = {
        context_dump: "Context dump",
        exploration: "Strategic exploration",
        deep_dive: "Focused deep-dive",
        gap_analysis: "Gap analysis",
      };
      const modeName = modeNames[mode] || mode;
      content += `\n\n---\n\nThe user has selected **${modeName}** mode. Start there directly — don't ask them to choose a mode.`;
    }
    return {
      content: [{ type: "text", text: content }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
