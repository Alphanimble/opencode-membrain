#!/usr/bin/env node
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import * as readline from "node:readline";
import { stripJsoncComments } from "./services/jsonc.js";

const OPENCODE_CONFIG_DIR = join(homedir(), ".config", "opencode");
const OPENCODE_COMMAND_DIR = join(OPENCODE_CONFIG_DIR, "command");
const PLUGIN_NAME = "opencode-membrain@latest";

const MEMBRAIN_INIT_COMMAND = `---
description: Initialize Mem-Brain with comprehensive codebase knowledge
---

# Initializing Mem-Brain

You are initializing persistent memory for this codebase using Mem-Brain - an agentic memory system with semantic search and graph relationships.

## Understanding Mem-Brain

Mem-Brain is different from simple storage. It stores **atomic memory notes** (discrete facts) and automatically links them with **question-based relationships**.

### Key Principles:
1. **Atomic Notes**: One fact per memory, not conversation logs
2. **Question-Based Links**: Relationships are natural language questions ("What caused X?")
3. **Smart Merge**: Guardian automatically decides update vs create
4. **Unified Search**: Search both memories AND relationship questions

## What to Remember

### Project-Scoped Memories:
- Build/test/lint commands and scripts
- Technology stack and dependencies
- Architecture and key directories
- Code conventions and patterns
- Known issues and solutions
- API endpoints and data flow

### User-Scoped Memories:
- Personal coding preferences
- Communication style preferences
- Workflow habits

## Tag Strategy

Mem-Brain uses tags as universal namespaces. The system auto-adds scope and temporal tags, but you should add type and domain tags.

### Auto-Added Tags:
- **Scope**: \`scope.user\` or \`scope.project\` (based on directory)
- **Temporal**: \`time.YYYY\` (current year), \`time.QN\` (quarter)

### Recommended Tag Categories:
- **Type**: \`type.preference\`, \`type.project-config\`, \`type.architecture\`, \`type.learned-pattern\`, \`type.error-solution\`, \`type.decision\`
- **Domain**: \`domain.frontend\`, \`domain.backend\`, \`domain.devops\`, \`domain.database\`, \`domain.security\`, \`domain.api\`, \`domain.ui\`
- **Technology**: \`tech.react\`, \`tech.nodejs\`, \`tech.typescript\`, \`tech.docker\`, etc.
- **Status**: \`status.active\`, \`status.archived\`, \`status.deprecated\`
- **Priority**: \`priority.high\`, \`priority.medium\`, \`priority.low\`
- **Confidence**: \`confidence.verified\`, \`confidence.experimental\`
- **Source**: \`source.experience\`, \`source.docs\`, \`source.research\`

### Examples:
\`\`\`
membrain(mode: "add", 
  content: "Uses React with TypeScript",
  tags: ["type.project-config", "domain.frontend", "tech.react", "tech.typescript"]
)

membrain(mode: "add",
  content: "User prefers dark mode",
  tags: ["type.preference", "domain.ui", "confidence.verified"]
)

membrain(mode: "add",
  content: "Chose PostgreSQL over MongoDB for ACID compliance",
  tags: ["type.decision", "domain.database", "confidence.verified", "source.research"]
)
\`\`\`

### Searching with Tags:
\`\`\`
// All project configurations
membrain(mode: "search", query: "config", keywordFilter: "scope.project|type.project-config")

// High priority backend patterns
membrain(mode: "search", query: "patterns", keywordFilter: "priority.high|domain.backend")

// Recent learnings
membrain(mode: "search", query: "learnings", keywordFilter: "type.learned-pattern|time.2024")

// Frontend technologies
membrain(mode: "search", query: "frontend", keywordFilter: "tech.react|tech.vue|tech.angular")
\`\`\`

## Research Approach

This is **deep research** initialization. Be thorough (~30+ tool calls).

### File-Based Research:
- README.md, CONTRIBUTING.md, AGENTS.md
- Package manifests (package.json, Cargo.toml, etc.)
- Config files (.eslintrc, tsconfig.json)
- CI/CD configs (.github/workflows/)

### Git-Based Research:
- \`git log --oneline -20\` - Recent history
- \`git branch -a\` - Branching strategy
- \`git shortlog -sn --all | head -10\` - Main contributors

### Explore Tasks:

Task(explore, "What is the tech stack and key dependencies?")
Task(explore, "What is the project structure? Key directories?")
Task(explore, "How do you build, test, and run this project?")
Task(explore, "What are the main architectural patterns?")

## Saving Memories

Use the \`membrain\` tool for each distinct insight:

\`\`\`
membrain(mode: "add", content: "...", tags: ["..."])
\`\`\`

### Good Memory Examples:
- "Uses Bun runtime. Commands: bun install, bun run dev, bun test"
- "API routes in src/routes/, handlers in src/handlers/. Hono framework."
- "Auth uses Redis sessions, not JWT. Implementation in src/lib/auth.ts"
- "Never use \`any\` type - strict TypeScript. Use \`unknown\` and narrow."
- "Database migrations must be backward compatible"

### Guidelines:
- Save each distinct insight as a separate memory
- Use relevant tags: ["project-config", "architecture", "learned-pattern", "error-solution"]
- Be concise but include enough context
- Update memories incrementally (don't wait until the end)

## Your Task

1. Research the codebase thoroughly
2. Save memories incrementally as you discover insights
3. Focus on atomic, discrete facts
4. Let Mem-Brain's Guardian handle linking
5. Summarize what was learned and ask if user wants refinement
`;

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function confirm(rl: readline.Interface, question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n) `, (answer) => {
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

function findOpencodeConfig(): string | null {
  const candidates = [
    join(OPENCODE_CONFIG_DIR, "opencode.jsonc"),
    join(OPENCODE_CONFIG_DIR, "opencode.json"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

function addPluginToConfig(configPath: string): boolean {
  try {
    const content = readFileSync(configPath, "utf-8");
    
    if (content.includes("opencode-membrain")) {
      console.log("Plugin already registered in config");
      return true;
    }

    const jsonContent = stripJsoncComments(content);
    let config: Record<string, unknown>;
    
    try {
      config = JSON.parse(jsonContent);
    } catch {
      console.error("Failed to parse config file");
      return false;
    }

    const plugins = (config.plugin as string[]) || [];
    plugins.push(PLUGIN_NAME);
    config.plugin = plugins;

    if (configPath.endsWith(".jsonc")) {
      if (content.includes('"plugin"')) {
        const newContent = content.replace(
          /("plugin"\s*:\s*\[)([^\]]*?)(\])/,
          (_match, start, middle, end) => {
            const trimmed = middle.trim();
            if (trimmed === "") {
              return `${start}\n    "${PLUGIN_NAME}"\n  ${end}`;
            }
            return `${start}${middle.trimEnd()},\n    "${PLUGIN_NAME}"\n  ${end}`;
          }
        );
        writeFileSync(configPath, newContent);
      } else {
        const newContent = content.replace(
          /^(\s*\{)/,
          `$1\n  "plugin": ["${PLUGIN_NAME}"],`
        );
        writeFileSync(configPath, newContent);
      }
    } else {
      writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    console.log(`Added plugin to ${configPath}`);
    return true;
  } catch (err) {
    console.error("Failed to update config:", err);
    return false;
  }
}

function createNewConfig(): boolean {
  const configPath = join(OPENCODE_CONFIG_DIR, "opencode.jsonc");
  mkdirSync(OPENCODE_CONFIG_DIR, { recursive: true });
  
  const config = `{
  "plugin": ["${PLUGIN_NAME}"]
}
`;
  
  writeFileSync(configPath, config);
  console.log(`Created ${configPath}`);
  return true;
}

function createCommands(): boolean {
  mkdirSync(OPENCODE_COMMAND_DIR, { recursive: true });

  const initPath = join(OPENCODE_COMMAND_DIR, "membrain-init.md");
  writeFileSync(initPath, MEMBRAIN_INIT_COMMAND);
  console.log(`Created /membrain-init command`);

  return true;
}

function createConfigTemplate(): boolean {
  const membrainConfigPath = join(OPENCODE_CONFIG_DIR, "membrain.jsonc");
  
  if (existsSync(membrainConfigPath)) {
    console.log("Mem-Brain config already exists");
    return true;
  }

  const configTemplate = `{
  // Mem-Brain API credentials
  // You can also set these as environment variables:
  // export MEMBRAIN_API_KEY="mb_live_..."
  // export MEMBRAIN_API_URL="https://your-membrain-api.com"
  
  "apiKey": "your_api_key_here",
  "apiUrl": "https://your-membrain-api.com",
  
  // Number of memories to inject per request
  "maxMemories": 5,
  
  // Max project memories listed
  "maxProjectMemories": 10,
  
  // Extra keyword patterns for memory detection (regex)
  // "keywordPatterns": ["log\\\\s+this", "write\\\\s+down"],
  
  // Context usage ratio that triggers compaction (0-1)
  "compactionThreshold": 0.80
}
`;

  writeFileSync(membrainConfigPath, configTemplate);
  console.log(`Created ${membrainConfigPath} template`);
  console.log("Edit this file to add your Mem-Brain API credentials");
  return true;
}

interface InstallOptions {
  tui: boolean;
}

async function install(options: InstallOptions): Promise<number> {
  console.log("\nMem-Brain plugin installer\n");

  const rl = options.tui ? createReadline() : null;

  // Step 1: Register plugin in config
  console.log("Step 1: Register plugin in OpenCode config");
  const configPath = findOpencodeConfig();
  
  if (configPath) {
    if (options.tui) {
      const shouldModify = await confirm(rl!, `Add plugin to ${configPath}?`);
      if (!shouldModify) {
        console.log("Skipped.");
      } else {
        addPluginToConfig(configPath);
      }
    } else {
      addPluginToConfig(configPath);
    }
  } else {
    if (options.tui) {
      const shouldCreate = await confirm(rl!, "No OpenCode config found. Create one?");
      if (!shouldCreate) {
        console.log("Skipped.");
      } else {
        createNewConfig();
      }
    } else {
      createNewConfig();
    }
  }

  // Step 2: Create commands
  console.log("\nStep 2: Create /membrain-init command");
  if (options.tui) {
    const shouldCreate = await confirm(rl!, "Add membrain commands?");
    if (!shouldCreate) {
      console.log("Skipped.");
    } else {
      createCommands();
    }
  } else {
    createCommands();
  }

  // Step 3: Create config template
  console.log("\nStep 3: Create config template");
  if (options.tui) {
    const shouldCreate = await confirm(rl!, "Create Mem-Brain config template?");
    if (!shouldCreate) {
      console.log("Skipped.");
    } else {
      createConfigTemplate();
    }
  } else {
    createConfigTemplate();
  }

  if (rl) rl.close();

  // Final instructions
  console.log("\n" + "-".repeat(50));
  console.log("\nFinal step: Configure Mem-Brain\n");
  console.log("Set environment variables:");
  console.log('  export MEMBRAIN_API_KEY="mb_live_..."');
  console.log('  export MEMBRAIN_API_URL="https://your-membrain-api.com"');
  console.log("\nOr edit ~/.config/opencode/membrain.jsonc");
  console.log("\n" + "-".repeat(50));
  console.log("\nSetup complete! Restart OpenCode to activate.\n");
  console.log("Run /membrain-init to initialize codebase memory.\n");
  
  return 0;
}

function printHelp(): void {
  console.log(`
opencode-membrain - Persistent memory for OpenCode agents using Mem-Brain

Commands:
  install    Install and configure the plugin
    --no-tui   Non-interactive mode (for LLM agents)
  help       Show this help message

Examples:
  bunx opencode-membrain@latest install
  bunx opencode-membrain@latest install --no-tui
`);
}

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
  printHelp();
  process.exit(0);
}

if (args[0] === "install") {
  const noTui = args.includes("--no-tui");
  install({ tui: !noTui }).then((code) => process.exit(code));
} else {
  console.error(`Unknown command: ${args[0]}`);
  printHelp();
  process.exit(1);
}
