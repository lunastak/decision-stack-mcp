// Fetches SKILL.md from lunastak/decision-stack, strips YAML frontmatter,
// and writes the body to src/instructions.ts as an exported template literal.
//
// Pin to a different ref by setting DECISION_STACK_REF (e.g. a tag or commit SHA).
// Defaults to "main" for launch — switch to a SHA when you want reproducibility.

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../src/instructions.ts");

const ref = process.env.DECISION_STACK_REF ?? "main";
const url = `https://raw.githubusercontent.com/lunastak/decision-stack/${ref}/SKILL.md`;

console.log(`Fetching ${url}`);
const res = await fetch(url);
if (!res.ok) {
  throw new Error(`Failed to fetch SKILL.md: ${res.status} ${res.statusText}`);
}
const raw = await res.text();

// Strip YAML frontmatter (--- ... --- at the very top of the file)
const fmMatch = raw.match(/^---\n[\s\S]*?\n---\n+/);
const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;

// Escape backticks and ${} for template literal safety
const escaped = body
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

const output = `// Auto-generated from lunastak/decision-stack SKILL.md (ref: ${ref}) — do not edit directly\nexport const INSTRUCTIONS = \`${escaped}\`;\n`;

writeFileSync(outputPath, output);
console.log(`Built instructions.ts (${body.length} chars from ref ${ref})`);
