# Mem-Brain Plugin Improvement Plan

## Overview

This document outlines comprehensive improvements to unlock the full power of Mem-Brain's semantic memory system with graph relationships for OpenCode.

## Current State Analysis

### Strengths
- ✅ Semantic search with natural language queries
- ✅ Auto-linking (113 links across 86 memories = 1.31 link density)
- ✅ Regex-based keyword filtering (undocumented but working)
- ✅ Tag-based organization
- ✅ Versioning infrastructure
- ✅ Multi-ID retrieval
- ✅ Filter-based deletion

### Critical Issues
- ❌ Get command returns empty `{}` instead of memory details
- ❌ Similarity scores all show `0` instead of actual values
- ❌ ~60% junk data ("[No content]" from edge case testing)
- ❌ Regex keyword filtering not documented
- ❌ No deduplication logic
- ❌ Context injection only on first message

### Missing Features
- Missing tag-based scoping (user/project via tags)
- Missing temporal tagging (timestamps via tags)
- Missing confidence levels
- Missing source attribution
- Missing status workflows

---

## Phase 1: Critical Bug Fixes (Priority: 🔴 HIGH)

### 1.1 Fix Get Command
**File**: `src/services/client.ts`

**Current Issue**: Returns empty object `{}`

**Fix**: Ensure proper API response parsing
```typescript
async getMemory(memoryId: string): Promise<MembrainResponse<Memory>> {
  const response = await apiRequest<Memory>(`/memories/${memoryId}`, {
    method: "GET",
  });
  
  // Add debugging
  log("getMemory raw response", { 
    success: response.success, 
    hasData: !!response.data,
    dataKeys: response.data ? Object.keys(response.data) : []
  });
  
  return response;
}
```

**Verify**: Test with known memory IDs and check response structure

### 1.2 Fix Similarity Scores
**File**: `src/index.ts` (search results formatting)

**Current Issue**: All similarity scores show `0`

**Fix**: Check if similarity is undefined vs 0
```typescript
results: memories.map((m) => ({
  id: m.id,
  content: m.content ? m.content.slice(0, 200) + (m.content.length > 200 ? "..." : "") : "[No content]",
  similarity: m.similarity !== undefined && m.similarity !== null 
    ? Math.round(m.similarity * 100) 
    : 0,
  tags: m.tags,
})),
```

**Alternative**: If API returns null, check if backend is calculating similarities

### 1.3 Clean Up Empty Memories
**Action**: Add cleanup command or auto-cleanup

**File**: `src/index.ts` (add to tool definition)

```typescript
// Add new mode
membrain(mode: "cleanup", dryRun: true)  // Preview what would be deleted
membrain(mode: "cleanup", dryRun: false) // Actually delete
```

**Implementation**:
```typescript
case "cleanup": {
  // Find all empty memories
  const emptyResults = await membrainClient.searchMemories("", 100);
  const emptyMemories = emptyResults.data?.filter(m => 
    !m.content || m.content === "[No content]" || m.content.trim() === ""
  ) || [];
  
  if (args.dryRun) {
    return JSON.stringify({
      success: true,
      dryRun: true,
      wouldDelete: emptyMemories.length,
      memories: emptyMemories.map(m => ({ id: m.id, content: m.content })),
    });
  }
  
  // Delete empty memories
  const deletedIds = [];
  for (const memory of emptyMemories) {
    if (memory.id) {
      await membrainClient.deleteMemory(memory.id);
      deletedIds.push(memory.id);
    }
  }
  
  return JSON.stringify({
    success: true,
    deleted: deletedIds.length,
    deletedIds: deletedIds.slice(0, 20),
  });
}
```

---

## Phase 2: Documentation & Examples (Priority: 🟡 MEDIUM)

### 2.1 Document Regex Keyword Filtering
**File**: `src/index.ts` (tool description)

**Current**: Basic description

**Improved**:
```typescript
description: `Manage and query the Mem-Brain persistent memory system...

## Advanced Search with Regex Filtering

The keywordFilter parameter accepts regex patterns for powerful tag-based filtering:

### Examples:
- Single tag: keywordFilter: "react"
- Multiple tags (OR): keywordFilter: "react|vue|angular"
- Pattern matching: keywordFilter: "micro*" (matches microservices)
- Complex regex: keywordFilter: "^[a-z]+(-[a-z]+)+$" (hyphenated tags)
- Combined search: keywordFilter: "frontend|backend|api"

### Use Cases:
- Search all database technologies: keywordFilter: "mongo|postgre|redis"
- Find architecture patterns: keywordFilter: "microservices|event-driven|ddd"
- Filter by scope: keywordFilter: "scope.user|scope.project"
- Temporal search: keywordFilter: "time.2024|time.2023"

### Pro Tips:
- Use | for OR operations
- Use * for wildcards
- Use ^ and $ for exact matches
- Combine with semantic query for precision

Examples:
- membrain(mode: "search", query: "authentication", keywordFilter: "jwt|oauth", k: 5)
- membrain(mode: "search", query: "databases", keywordFilter: "sql|nosql", k: 10)
- membrain(mode: "search", query: "deployment", keywordFilter: "docker|kubernetes", k: 5)
`,
```

### 2.2 Update Help Documentation
**File**: `src/index.ts` (help mode)

Add comprehensive examples section:
```typescript
{
  command: "search",
  description: "Search memories by semantic similarity with optional regex tag filtering",
  args: ["query (required)", "k? (default: 5)", "keywordFilter? (regex pattern)"],
  examples: [
    'membrain(mode: "search", query: "react components", k: 3)',
    'membrain(mode: "search", query: "authentication", keywordFilter: "jwt|oauth", k: 5)',
    'membrain(mode: "search", query: "databases", keywordFilter: "mongo|postgre|redis", k: 10)',
    'membrain(mode: "search", query: "architecture", keywordFilter: "microservices|event-driven", k: 5)',
    'membrain(mode: "search", query: "patterns", keywordFilter: "ddd|solid|factory", k: 5)',
  ],
}
```

### 2.3 Create Comprehensive Examples File
**File**: `docs/EXAMPLES.md` (new)

```markdown
# Mem-Brain Usage Examples

## Basic Operations

### Adding Memories
\`\`\`
membrain(mode: "add", content: "User prefers dark mode", tags: ["preference", "ui"])
membrain(mode: "add", content: "Project uses React 18 with TypeScript", tags: ["project", "frontend", "react"])
membrain(mode: "add", content: "API rate limit is 1000 requests/hour", tags: ["project", "api", "config"])
\`\`\`

### Searching with Regex Filtering

#### Find all frontend technologies
\`\`\`
membrain(mode: "search", query: "frontend frameworks", keywordFilter: "react|vue|angular", k: 10)
\`\`\`

#### Search authentication methods
\`\`\`
membrain(mode: "search", query: "how to authenticate users", keywordFilter: "jwt|oauth|security", k: 5)
\`\`\`

#### Find database options
\`\`\`
membrain(mode: "search", query: "database for my project", keywordFilter: "mongo|postgre|redis|sql|nosql", k: 10)
\`\`\`

#### Architecture patterns
\`\`\`
membrain(mode: "search", query: "scaling strategy", keywordFilter: "microservices|kubernetes|load-balancing", k: 5)
\`\`\`

#### Design patterns
\`\`\`
membrain(mode: "search", query: "design patterns I should know", keywordFilter: "ddd|solid|factory|singleton|observer", k: 10)
\`\`\`

### Retrieving Memories

\`\`\`
membrain(mode: "get", memoryId: "abc-123")
membrain(mode: "get", memoryIds: ["abc-123", "def-456", "ghi-789"])
\`\`\`

### Deleting Memories

\`\`\`
membrain(mode: "delete", memoryId: "abc-123")
membrain(mode: "delete", tags: ["temp"])
membrain(mode: "delete", category: "draft")
\`\`\`

## Advanced Tag Strategies

### Hierarchical Tags
\`\`\`
membrain(mode: "add", 
  content: "React hooks best practices", 
  tags: ["tech.frontend", "tech.frontend.react", "tech.frontend.react.hooks"]
)

// Search all frontend
membrain(mode: "search", query: "frontend", keywordFilter: "tech.frontend.*", k: 10)
\`\`\`

### Multi-Dimensional Tagging
\`\`\`
membrain(mode: "add",
  content: "Microservices communication patterns",
  tags: [
    "scope.project",
    "type.architecture",
    "domain.backend",
    "tech.microservices",
    "pattern.event-driven",
    "status.active",
    "time.2024"
  ]
)
\`\`\`

### Temporal Tags
\`\`\`
membrain(mode: "add",
  content: "New React 19 features",
  tags: ["react", "frontend", "time.2024", "time.Q1"]
)

// Find all 2024 memories
membrain(mode: "search", query: "recent learnings", keywordFilter: "time.2024", k: 20)
\`\`\`

## Real-World Workflows

### Learning Session
1. Search existing knowledge: `membrain(mode: "search", query: "topic", k: 5)`
2. Learn new things
3. Save insights: `membrain(mode: "add", content: "...", tags: ["learned", "topic"])`
4. Link related: Search and review connections

### Project Configuration
1. Add tech stack: `membrain(mode: "add", content: "Uses Bun runtime", tags: ["project", "tech"])`
2. Add build commands: `membrain(mode: "add", content: "bun run build && bun test", tags: ["project", "commands"])`
3. Add conventions: `membrain(mode: "add", content: "Never use any type", tags: ["project", "conventions"])`
4. Query when needed: `membrain(mode: "search", query: "build command", keywordFilter: "project", k: 3)`

### Decision Tracking
1. Document decision: `membrain(mode: "add", content: "Chose PostgreSQL over MongoDB because...", tags: ["decision", "database", "rationale"])`
2. Update if changed: Add new memory with evolution
3. Review history: `membrain(mode: "search", query: "database decision", k: 5)`

## Pro Tips

1. **Use atomic notes**: One fact per memory
2. **Tag consistently**: Use same tags for similar concepts
3. **Search before adding**: Avoid duplicates
4. **Use regex filters**: Narrow results precisely
5. **Trust the Guardian**: Let it handle linking
6. **Review connections**: Check linked memories for insights
7. **Clean up regularly**: Remove outdated or empty memories
8. **Use descriptive content**: Make memories self-explanatory
```

---

## Phase 3: Enhanced Context Injection (Priority: 🟡 MEDIUM)

### 3.1 Smart Context Injection Strategy
**File**: `src/index.ts` (chat.message handler)

**Current**: Only injects on first message

**Improved**: Inject contextually based on conversation

```typescript
"chat.message": async (input, output) => {
  // ... existing code ...
  
  const isFirstMessage = !injectedSessions.has(input.sessionID);
  const isQuestion = detectQuestion(userMessage);
  const topicChanged = detectTopicChange(userMessage, previousMessages);
  
  if (isFirstMessage || (isQuestion && topicChanged)) {
    // Search for relevant memories based on current topic
    const relevantQuery = extractKeyConcepts(userMessage);
    const [relevantMemories, stats] = await Promise.all([
      membrainClient.searchMemories(relevantQuery, CONFIG.maxMemories),
      membrainClient.getStats(),
    ]);
    
    // Filter to high-similarity memories only
    const highQualityMemories = relevantMemories.data?.filter(
      m => (m.similarity || 0) > 0.3
    ) || [];
    
    if (highQualityMemories.length > 0) {
      const context = formatContextForPrompt({
        userMemories: [], // Don't show user prefs mid-conversation
        projectMemories: highQualityMemories,
        stats: stats.data,
      });
      
      if (context) {
        const contextPart: Part = {
          id: `membrain-context-${Date.now()}`,
          sessionID: input.sessionID,
          messageID: output.message.id,
          type: "text",
          text: `[RELEVANT CONTEXT]\n${context}`,
          synthetic: true,
        };
        output.parts.unshift(contextPart);
      }
    }
  }
}

// Helper functions
function detectQuestion(text: string): boolean {
  return /^(what|how|why|when|where|who|can|should|is|are|do|does|did|will|would|could)/i.test(text) ||
         /\?$/.test(text);
}

function detectTopicChange(current: string, previous: string[]): boolean {
  if (previous.length === 0) return true;
  const currentKeywords = extractKeywords(current);
  const previousKeywords = extractKeywords(previous[previous.length - 1]);
  const overlap = currentKeywords.filter(k => previousKeywords.includes(k));
  return overlap.length / currentKeywords.length < 0.3; // Less than 30% overlap
}

function extractKeyConcepts(text: string): string {
  // Extract nouns and technical terms
  const concepts = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  const techTerms = text.match(/\b(react|node|docker|kubernetes|api|database|auth)\b/gi) || [];
  return [...new Set([...concepts, ...techTerms])].join(" ");
}
```

### 3.2 Context Quality Filtering
**File**: `src/services/context.ts`

Add quality checks:
```typescript
export function formatContextForPrompt(data: ContextData, options?: { minSimilarity?: number }): string | null {
  const minSimilarity = options?.minSimilarity || 0.2;
  
  // Filter out low-quality memories
  const qualityUserMemories = data.userMemories?.filter(
    m => (m.similarity || 0) >= minSimilarity && m.content && m.content !== "[No content]"
  ) || [];
  
  const qualityProjectMemories = data.projectMemories?.filter(
    m => (m.similarity || 0) >= minSimilarity && m.content && m.content !== "[No content]"
  ) || [];
  
  // ... rest of formatting
}
```

---

## Phase 4: Tag-Based Scoping System (Priority: 🟢 LOW)

### 4.1 Implement Tag-Based Scoping
**Goal**: Replace need for separate scope field with tags

**Strategy**: Auto-add scope tags on memory creation

**File**: `src/index.ts` (add mode)

```typescript
case "add": {
  // ... existing validation ...
  
  // Auto-add scope tags based on directory
  const autoTags = [...(args.tags || [])];
  const { user, project } = getTags(directory);
  
  // Add scope tags if not present
  if (!autoTags.some(t => t.startsWith("scope."))) {
    autoTags.push(`scope.${user.includes("user") ? "user" : "project"}`);
  }
  
  // Add temporal tag
  const now = new Date();
  autoTags.push(`time.${now.getFullYear()}`);
  autoTags.push(`time.Q${Math.floor(now.getMonth() / 3) + 1}`);
  
  // Add type tag if provided as category
  if (args.category && !autoTags.some(t => t.startsWith("type."))) {
    autoTags.push(`type.${args.category}`);
  }
  
  const result = await membrainClient.addMemory(sanitizedContent, autoTags, args.category);
  
  // ... rest of response
}
```

### 4.2 Enhanced Search with Scope Filtering
**File**: `src/services/client.ts`

```typescript
async searchMemories(
  query: string, 
  k: number = 5, 
  keywordFilter?: string | string[],
  options?: { scope?: "user" | "project" | "all" }
): Promise<MembrainResponse<SearchResult[]>> {
  
  // Auto-add scope filter if specified
  let finalFilter = keywordFilter;
  if (options?.scope && options.scope !== "all") {
    const scopeTag = `scope.${options.scope}`;
    if (typeof keywordFilter === "string") {
      finalFilter = `${keywordFilter}|${scopeTag}`;
    } else if (Array.isArray(keywordFilter)) {
      finalFilter = [...keywordFilter, scopeTag];
    } else {
      finalFilter = scopeTag;
    }
  }
  
  // ... rest of search
}
```

### 4.3 Tag Suggestions in CLI Init
**File**: `src/cli.ts`

Update init command to suggest tag strategy:
```typescript
const MEMBRAIN_INIT_COMMAND = `...

## Tag Strategy

Mem-Brain uses tags as universal namespaces. Recommended tag structure:

### Required Tags:
- **Scope**: \`scope.user\` or \`scope.project\`
- **Type**: \`type.preference\`, \`type.project-config\`, \`type.architecture\`, \`type.learned-pattern\`, \`type.error-solution\`
- **Domain**: \`domain.frontend\`, \`domain.backend\`, \`domain.devops\`, \`domain.database\`, \`domain.security\`

### Optional Tags:
- **Technology**: \`tech.react\`, \`tech.nodejs\`, \`tech.docker\`
- **Status**: \`status.active\`, \`status.archived\`, \`status.deprecated\`
- **Priority**: \`priority.high\`, \`priority.medium\`, \`priority.low\`
- **Temporal**: \`time.2024\`, \`time.Q1\` (auto-added)
- **Confidence**: \`confidence.verified\`, \`confidence.experimental\`
- **Source**: \`source.experience\`, \`source.docs\`, \`source.research\`

### Examples:
\`\`\`
membrain(mode: "add", 
  content: "Uses React with TypeScript",
  tags: ["scope.project", "type.project-config", "domain.frontend", "tech.react", "tech.typescript"]
)

membrain(mode: "add",
  content: "User prefers dark mode",
  tags: ["scope.user", "type.preference", "domain.ui", "confidence.verified"]
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
\`\`\`
`;
```

---

## Phase 5: System Prompt Improvements

### 5.1 Enhanced System Prompt for Memory Nudging
**Current**: Basic keyword detection

**Improved**: Context-aware nudging with examples

```typescript
const MEMORY_NUDGE_MESSAGE = `[MEMORY TRIGGER DETECTED]
The user is sharing information that should be remembered. You MUST use the \`membrain\` tool with \`mode: "add"\` to save this.

**What to remember:**
- Preferences ("I prefer...", "I like...", "I hate...")
- Facts about the project ("We use...", "The build command is...", "Never do...")
- Decisions made ("Let's go with...", "We decided...")
- Learned patterns ("The best way to...", "Always remember to...")
- Errors and solutions ("The fix was...", "This error means...")
- Configuration details ("API key is...", "Port is...", "Database is...")

**Tag Guidelines:**
\`\`\`
scope: user | project
type: preference | project-config | architecture | learned-pattern | error-solution | decision
domain: frontend | backend | devops | database | security | api | ui
confidence: verified | likely | experimental
\`\`\`

**Examples of good memories:**
- "User prefers dark mode in all applications" → tags: ["user", "preference", "ui"]
- "Build command: bun run build && bun test" → tags: ["project", "commands", "devops"]
- "Uses PostgreSQL with pgvector extension" → tags: ["project", "database", "config"]
- "Never use \`any\` type - strict TypeScript" → tags: ["project", "conventions", "typescript"]
- "Database migrations must be backward compatible" → tags: ["project", "database", "best-practice"]
- "Rate limit is 1000 requests/hour" → tags: ["project", "api", "config"]

**Format:**
\`\`\`
membrain(mode: "add", content: "CONCISE FACT HERE", tags: ["scope", "type", "domain", "..."])
\`\`\`

**DO NOT skip this step. The user explicitly wants you to remember this information.**`;
```

### 5.2 Add Memory Review Prompt
**New**: Periodic memory review suggestion

```typescript
const MEMORY_REVIEW_MESSAGE = `[MEMORY REVIEW SUGGESTED]
You have accumulated several memories in this conversation. Consider:

1. **Consolidating similar memories** - Are there duplicates or near-duplicates?
2. **Updating outdated information** - Has anything changed?
3. **Linking related memories** - Use get command to see connections
4. **Cleaning up** - Delete temporary or test memories

To review: membrain(mode: "stats")
To search: membrain(mode: "search", query: "topic", k: 10)
To cleanup: membrain(mode: "cleanup", dryRun: true)`;
```

---

## Phase 6: Testing & Validation

### 6.1 Test Plan

**Unit Tests** (File: `tests/test_api.py` or similar):
```typescript
// Test regex filtering
describe("search with keywordFilter", () => {
  test("single tag filter", async () => {
    const result = await membrainClient.searchMemories("test", 5, "react");
    expect(result.data?.every(m => m.tags?.includes("react"))).toBe(true);
  });
  
  test("OR pattern filter", async () => {
    const result = await membrainClient.searchMemories("test", 10, "react|vue|angular");
    expect(result.data?.length).toBeGreaterThan(0);
  });
  
  test("wildcard filter", async () => {
    const result = await membrainClient.searchMemories("test", 5, "micro*");
    expect(result.data?.some(m => m.tags?.some(t => t.includes("micro")))).toBe(true);
  });
});

// Test get command
describe("get memory", () => {
  test("returns memory with content", async () => {
    const addResult = await membrainClient.addMemory("Test content", ["test"]);
    const getResult = await membrainClient.getMemory(addResult.data!.id);
    expect(getResult.data?.content).toBe("Test content");
    expect(getResult.data?.tags).toContain("test");
  });
  
  test("returns linked neighbors", async () => {
    // Add two related memories
    const mem1 = await membrainClient.addMemory("React info", ["react"]);
    const mem2 = await membrainClient.addMemory("JavaScript info", ["javascript"]);
    // Guardian should link them
    const getResult = await membrainClient.getMemory(mem1.data!.id);
    expect(getResult.data?.linked_neighbors?.length).toBeGreaterThan(0);
  });
});

// Test cleanup
describe("cleanup", () => {
  test("finds empty memories", async () => {
    await membrainClient.addMemory("", ["test"]); // Empty
    await membrainClient.addMemory("Valid content", ["test"]); // Valid
    const searchResult = await membrainClient.searchMemories("", 100, "test");
    const emptyCount = searchResult.data?.filter(m => !m.content).length;
    expect(emptyCount).toBeGreaterThan(0);
  });
});
```

**Integration Tests**:
1. Full workflow: Add → Search → Get → Update → Delete
2. Context injection: Verify memories appear in prompts
3. Regex filtering: Complex patterns work correctly
4. Auto-tagging: Scope and temporal tags added
5. Graph building: Links created between related memories

### 6.2 Performance Benchmarks

**Metrics to track**:
- Search latency (target: <100ms for 86 memories)
- Add memory latency (target: <200ms)
- Context injection time (target: <50ms)
- Memory size (target: <1KB per memory average)

---

## Implementation Timeline

### Week 1: Critical Fixes
- [ ] Fix get command
- [ ] Fix similarity scores
- [ ] Add cleanup command
- [ ] Test all fixes

### Week 2: Documentation
- [ ] Document regex keyword filtering
- [ ] Create EXAMPLES.md
- [ ] Update help text
- [ ] Update CLI init command

### Week 3: Enhanced Features
- [ ] Smart context injection
- [ ] Context quality filtering
- [ ] Tag-based scoping
- [ ] Auto-tagging

### Week 4: Polish & Testing
- [ ] Improved system prompts
- [ ] Memory review suggestions
- [ ] Comprehensive testing
- [ ] Performance optimization

---

## Success Metrics

After implementation:
- [ ] Get command returns full memory details with linked neighbors
- [ ] Similarity scores show actual values (0-100%)
- [ ] Zero "[No content]" memories in search results
- [ ] All memories have ≥3 tags (scope, type, domain)
- [ ] Context injection happens contextually (not just first message)
- [ ] Users can discover regex filtering from documentation
- [ ] Average search returns 5-10 relevant, high-quality memories
- [ ] Graph density maintained at >1.0 links per memory

---

## Notes

- Mem-Brain's tag-based architecture is **superior** to rigid schemas
- Regex filtering is a **hidden superpower** - document it!
- The graph structure is **already working well** (113 links!)
- Focus on **data quality** and **documentation** over new features
- Keep the **atomic notes** principle - one fact per memory
- Trust the **Guardian** - it's doing good work with auto-linking

---

**Last Updated**: 2024
**Priority**: Critical bugs → Documentation → Enhanced features → Polish
**Estimated Effort**: 4 weeks (part-time)
**Impact**: 9/10 system (from current 7/10)
