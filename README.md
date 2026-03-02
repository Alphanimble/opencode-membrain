# Mem-Brain Plugin for OpenCode

OpenCode plugin for persistent memory using [Mem-Brain](https://github.com/yourusername/mem-brain) - an agentic memory system with semantic search, graph relationships, and neuroscience-inspired architecture.

## Features

- **Semantic Memory Search**: Store and retrieve memories with vector similarity
- **Graph Memory Links**: Automatic linking between related memories (max 2 links per memory)
- **Question-Based Relationships**: Natural language questions as relationship descriptions
- **Smart Merge**: Guardian automatically decides update vs create new memory
- **Versioning with Decay**: 5-version history with automatic pruning
- **Atomic Memory Notes**: Discrete, non-overlapping memory units
- **Context Injection**: Automatic memory context on first message
- **Keyword Detection**: Auto-save when you say "remember", "save this", etc.
- **Privacy Protection**: Content in `<private>` tags never stored

## Quick Start

### For Humans

```bash
bunx opencode-membrain@latest install
```

Get your API key from your Mem-Brain API instance and set it:

```bash
export MEMBRAIN_API_KEY="mb_live_..."
export MEMBRAIN_API_URL="https://your-membrain-api.com"
```

### For LLM Agents

Paste this into OpenCode:
```
Install opencode-membrain by following https://raw.githubusercontent.com/yourusername/opencode-membrain/main/README.md
```

## Installation Steps

### Step 1: Run the installer

```bash
bunx opencode-membrain@latest install --no-tui
```

This will:
- Register the plugin in `~/.config/opencode/opencode.jsonc`
- Create the `/membrain-init` command

### Step 2: Configure API credentials

Set environment variables:

```bash
export MEMBRAIN_API_KEY="mb_live_..."
export MEMBRAIN_API_URL="https://your-membrain-api.com"
```

Or create `~/.config/opencode/membrain.jsonc`:

```jsonc
{
  "apiKey": "mb_live_...",
  "apiUrl": "https://your-membrain-api.com"
}
```

### Step 3: Verify setup

Restart OpenCode and run:

```bash
opencode -c
```

You should see `membrain` in the tools list.

### Step 4: Initialize codebase memory (optional)

Run `/membrain-init` to have the agent explore and memorize your codebase.

## Mem-Brain Architecture

Mem-Brain is different from simple key-value stores:

### Atomic Memory Notes
Memories are discrete units of meaning, not conversation logs:

**Bad**: "User: I like coffee. Assistant: That's great!"

**Good**:
- "User prefers coffee as beverage"
- "User experiences acid reflux from hot coffee"

### Question-Based Links
Relationships aren't typed edges like `FRIEND_OF`. They're natural language questions:

- "What caused the migration delay?"
- "How does this relate to compliance requirements?"
- "What coffee preparation method does the user prefer?"

### Smart Merge
When you call `add_memory()`, the Guardian automatically decides:
- **UPDATE**: Merge with existing memory (same concept)
- **CREATE**: New atomic note (related but distinct)

### Unified Search
Search both memories AND their relationship questions in the same semantic space.

## Tool Usage

The `membrain` tool is available to the agent:

| Mode | Args | Description |
|------|------|-------------|
| `add` | `content`, `tags?` | Store a new memory (Guardian decides update vs create) |
| `search` | `query`, `k?` | Search memories with semantic similarity |
| `get` | `memoryId` | Retrieve a specific memory with its linked neighbors |
| `delete` | `memoryId` | Delete a memory |
| `stats` | - | View memory system statistics |

**Example usage:**

```
User: "Remember that I prefer dark mode"
→ Agent uses membrain(mode: "add", content: "User prefers dark mode interfaces")

User: "How do I build this project?"
→ Agent uses membrain(mode: "search", query: "build commands")
→ Gets: "Uses bun run build with TypeScript"
```

## Context Injection

On first message, the agent receives invisible context:

```
[MEMBRAIN CONTEXT]

User Profile:
- Prefers concise responses
- Expert in Python

Project Knowledge:
- Uses Bun, not Node.js
- Build: bun run build

Recent Memories:
- [85%] Setting up PostgreSQL with pgvector
- [72%] API authentication with API keys
```

## Keyword Detection

Say these phrases and the agent auto-saves:
- "remember", "memorize", "save this"
- "note this", "keep in mind", "don't forget"
- "learn this", "store this", "record this"

Add custom triggers via `keywordPatterns` config.

## Configuration

Create `~/.config/opencode/membrain.jsonc`:

```jsonc
{
  // API key (can also use MEMBRAIN_API_KEY env var)
  "apiKey": "mb_live_...",
  
  // API base URL (can also use MEMBRAIN_API_URL env var)
  "apiUrl": "https://your-membrain-api.com",
  
  // Number of memories to inject per request
  "maxMemories": 5,
  
  // Max project memories listed
  "maxProjectMemories": 10,
  
  // Extra keyword patterns for memory detection (regex)
  "keywordPatterns": ["log\\s+this", "write\\s+down"],
  
  // Context usage ratio that triggers compaction (0-1)
  "compactionThreshold": 0.80
}
```

## Memory Scoping

| Scope | Tag | Persists |
|-------|-----|----------|
| User | `opencode_user_{sha256(git email)}` | All projects |
| Project | `opencode_project_{sha256(directory)}` | This project |

## Development

```bash
bun install
bun run build
bun run typecheck
```

Local install:

```jsonc
{
  "plugin": ["file:///path/to/opencode-membrain"]
}
```

## Logs

```bash
tail -f ~/.opencode-membrain.log
```

## License

MIT
