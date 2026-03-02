# Mem-Brain Skills for AI Agents

## Overview

You are an AI assistant with access to Mem-Brain, a persistent semantic memory system with graph relationships and automatic linking. This skill file provides comprehensive guidance on using Mem-Brain effectively based on extensive real-world testing.

**Current System Status:** 99 memories, 134 links (1.35 link density - excellent!)

---

## Core Capabilities

### 1. MEMORY WORKFLOW (CRITICAL)

**ALWAYS follow this workflow:**

```
1. SEARCH FIRST → Before answering, search relevant memories
2. SYNTHESIZE → Don't list memories, connect them thoughtfully  
3. STORE FACTS → Save preferences/facts/decisions as atomic notes
4. CHECK CONNECTIONS → Review linked memories for hidden insights
```

---

### 2. SEARCH STRATEGIES

#### Basic Semantic Search
```
membrain(mode: "search", query: "user preferences", k: 5)
```

#### Advanced Regex Filtering (POWERFUL)
Use `keywordFilter` with regex for surgical precision:

**Tag-based filtering:**
```
// Multiple technologies (OR)
membrain(mode: "search", query: "frontend", keywordFilter: "react|vue|angular", k: 10)

// Architecture patterns
membrain(mode: "search", query: "scaling", keywordFilter: "microservices|monolithic|event-driven", k: 5)

// Database options
membrain(mode: "search", query: "database", keywordFilter: "mongo|postgre|redis|sql|nosql", k: 10)

// Security methods
membrain(mode: "search", query: "authentication", keywordFilter: "jwt|oauth|security", k: 5)
```

**Auto-tag filtering:**
```
// All user-scoped memories
membrain(mode: "search", query: "preferences", keywordFilter: "^scope\\.user", k: 10)

// Recent 2026 memories
membrain(mode: "search", query: "recent", keywordFilter: "time\\.2026", k: 10)

// Specific quarter
membrain(mode: "search", query: "learned", keywordFilter: "time\\.Q1", k: 10)
```

#### Regex Pattern Reference

| Pattern | Matches | Example |
|---------|---------|---------|
| `react` | Exact tag | `react` |
| `react\|vue` | Either tag | `react` OR `vue` |
| `micro*` | Prefix | `microservices`, `micro-frontend` |
| `^scope\\.` | Starts with | `scope.user`, `scope.project` |
| `time\\.2026` | Exact namespace | `time.2026` |
| `^[a-z]+(-[a-z]+)+$` | Hyphenated | `event-driven`, `load-balancing` |
| `frontend\|backend` | Domain tags | `frontend` OR `backend` |

#### Temporal Queries (Natural Language Time)

The OpenCode plugin auto-generates multiple `time.*` tag formats during `membrain(mode: "add")`, making queries flexible:

**Search by natural language time references:**
```
// "Do you remember this from last Wednesday?"
membrain(mode: "search", query: "...", keywordFilter: "time\\.wednesday", k: 10)
// Matches: time.weekday.wednesday, time.day.wednesday, time.wednesday

// "What did we discuss in February?"
membrain(mode: "search", query: "...", keywordFilter: "time\\.month\\.february|time\\.2026-02", k: 10)
// Matches: time.month.february, time.month.2026-02, time.2026-02

// "That thing from week 5"
membrain(mode: "search", query: "...", keywordFilter: "time\\.week\\.5|time\\.week\\.2026-05", k: 10)
// Matches: time.week.5, time.week.2026-05

// "Remember that morning when..."
membrain(mode: "search", query: "...", keywordFilter: "time\\.morning", k: 10)
// Matches: time.morning

// "Winter project decisions"
membrain(mode: "search", query: "decisions", keywordFilter: "time\\.winter", k: 10)
// Matches: time.season.winter, time.winter

// "What happened on 2026-02-25?"
membrain(mode: "search", query: "...", keywordFilter: "time\\.date\\.2026-02-25|time\\.2026-02-25", k: 10)
// Matches: time.date.2026-02-25, time.2026-02-25

// "Q1 planning session"
membrain(mode: "search", query: "planning", keywordFilter: "time\\.Q1", k: 10)
// Matches: time.Q1, time.quarter.2026-Q1

// "Memories from 2026"
membrain(mode: "search", query: "...", keywordFilter: "time\\.2026", k: 10)
// Matches: time.2026, time.year.2026
```

---

### 3. UNDERSTANDING SEARCH RESULTS

#### Result Types
Search returns TWO types of results:

**1. Memories (type: "memory")** - Actual stored facts
```json
{
  "id": "abc-123",
  "content": "React is a JavaScript library",
  "similarity": 71,  // Percentage (0-100)
  "tags": ["react", "frontend", "javascript"],
  "type": "memory"
}
```

**2. Relationships (type: "relationship")** - Question-based connections
```json
{
  "content": "Relationship: What JavaScript library does the project use? How does React relate to the tech stack?",
  "similarity": 58,
  "type": "relationship",
  "source": "React is a JavaScript library...",
  "target": "Project uses React with TypeScript..."
}
```

**Key insight**: Relationships show the QUESTION that connects two memories. Read them for context!

#### Similarity Scores
- **70-100%**: Highly relevant, directly addresses query
- **50-69%**: Moderately relevant, related concepts
- **30-49%**: Weak relevance, tangential connection
- **0-29%**: Low relevance, use as last resort

---

### 4. STORAGE GUIDELINES

#### Atomic Notes Principle
**Write FACTS, not conversation:**

✅ **GOOD examples:**
- "User prefers dark mode in all applications"
- "Build command: bun run build && bun test"
- "Uses PostgreSQL with pgvector extension"
- "API Gateway pattern provides single entry point"

❌ **BAD examples:**
- "You said you like dark mode"
- "We talked about build commands earlier"
- "Remember when you mentioned..."

#### Tag Strategy (AUTO-ENHANCED)

**Auto-added tags (don't add manually):**
- `scope.project` (when no explicit `scope.*` tag is provided)
- **Temporal tags** (auto-generated by the plugin add flow):

| Dimension | Format Examples | Query Pattern |
|-----------|----------------|---------------|
| **Year** | `time.year.2026`, `time.2026` | `time\.2026` |
| **Month** | `time.month.2026-02`, `time.month.february`, `time.2026-02` | `time\.month\.february\|time\.2026-02` |
| **Date** | `time.date.2026-02-25`, `time.2026-02-25` | `time\.date\.2026-02-25` |
| **Day of Week** | `time.weekday.wednesday`, `time.day.wednesday`, `time.wednesday` | `time\.wednesday` |
| **Week** | `time.week.2026-05`, `time.week.5` | `time\.week\.5` |
| **Quarter** | `time.quarter.2026-Q1`, `time.Q1` | `time\.Q1` |
| **Time of Day** | `time.morning`, `time.afternoon`, `time.evening`, `time.night` | `time\.night` |
| **Season** | `time.season.winter`, `time.winter` | `time\.winter` |

**Why multiple formats?** The plugin intentionally generates redundant tags (e.g., `time.wednesday`, `time.day.wednesday`, `time.weekday.wednesday`) so you can query naturally:
- Simple: `time\.wednesday`
- Explicit: `time\.weekday\.wednesday`
- Flexible: `time\.wednesday|time\.day\.wednesday` (matches both)

This makes temporal queries intuitive - use whatever format feels natural!

**Recommended manual tags:**

| Category | Examples |
|----------|----------|
| **Type** | `type.preference`, `type.project-config`, `type.architecture`, `type.learned-pattern`, `type.error-solution` |
| **Domain** | `domain.frontend`, `domain.backend`, `domain.devops`, `domain.database`, `domain.security` |
| **Technology** | `tech.react`, `tech.nodejs`, `tech.typescript`, `tech.docker` |
| **Pattern** | `pattern.singleton`, `pattern.factory`, `pattern.microservices` |
| **Status** | `status.active`, `status.deprecated`, `status.experimental` |
| **Confidence** | `confidence.verified`, `confidence.likely`, `confidence.experimental` |

**Tagging examples:**
```
membrain(mode: "add", 
  content: "Uses React with TypeScript for frontend",
  tags: ["type.project-config", "domain.frontend", "tech.react"]
)
// Auto-adds: scope.project, time.year.2026, time.2026, time.month.2026-02, 
//            time.month.february, time.2026-02, time.date.2026-02-25, time.2026-02-25,
//            time.weekday.wednesday, time.day.wednesday, time.wednesday, 
//            time.week.2026-05, time.week.5, time.quarter.2026-Q1, time.Q1,
//            time.night, time.season.winter, time.winter

membrain(mode: "add",
  content: "User prefers dark mode interfaces",
  tags: ["type.preference", "domain.ui"]
)
// Auto-adds: scope.project + all temporal tags above
```

If you bypass the OpenCode plugin and call Mem-Brain API directly (e.g., raw `curl`), temporal tags are not guaranteed unless you provide them yourself.

---

### 5. WHEN TO REMEMBER

**Trigger phrases to watch for:**

**Preferences:**
- "I prefer...", "I like...", "I hate...", "I need..."
- "My favorite...", "I always...", "I never..."

**Project facts:**
- "We use...", "The command is...", "Never do..."
- "Build with...", "Deploy via...", "Test using..."

**Decisions:**
- "Let's go with...", "We decided...", "Chose X over Y"
- "The rationale is...", "Because of..."

**Learned patterns:**
- "The best way to...", "Always remember to..."
- "This error means...", "The fix was..."

**Configuration:**
- "API key is...", "Port is...", "Database URL..."
- "Set to...", "Configured as..."

---

### 6. CONTEXT INJECTION

The plugin automatically injects relevant context:

**On first message:**
```
[MEMBRAIN CONTEXT]
System: 99 memories, 134 links

User Preferences:
- [65%] Link: What other software preferences has the user recently shifted?
- [62%] Link: Does the user prefer dark mode or light mode?
- [59%] Link: What code editor does the user prefer?

Project Knowledge:
- [56%] Monolithic architecture keeps all code in one codebase
- [55%] Kubernetes orchestrates container deployments
```

**On every question:**
```
[RELEVANT MEMORIES for query: "how do I secure my api"]
- [76%] JWT tokens authenticate users in stateless systems
- [72%] Relationship: What authentication tokens are used with OAuth 2.0?
- [55%] Relationship: What is OAuth 2.0 as an authorization framework?
```

**How to use context:**
1. Read similarity scores (higher = more relevant)
2. Check both memories AND relationships
3. Note the questions in relationships - they provide context
4. Synthesize across multiple memories for complete answers

---

### 7. RETRIEVING MEMORIES

#### Get single memory with full details
```
membrain(mode: "get", memoryId: "abc-123")
```

**Returns:**
```json
{
  "id": "abc-123",
  "content": "Project uses React with TypeScript",
  "tags": ["tech-stack", "frontend"],
  "category": "Uncategorized",
  "evolution_history": [],  // Version history
  "linked_neighbors": [     // Connected memories
    {
      "memory_id": "xyz-789",
      "content": "React is a JavaScript library...",
      "relationship": "What JavaScript library does the project use?"
    }
  ]
}
```

#### Get multiple memories
```
membrain(mode: "get", memoryIds: ["abc-123", "def-456", "ghi-789"])
// Or comma-separated:
membrain(mode: "get", memoryIds: "abc-123, def-456, ghi-789")
```

#### Check linked neighbors (CRITICAL)
Always check `linked_neighbors` for hidden connections!

---

### 8. MEMORY VERSIONING

Memories automatically version when updated:

**Version types:**
- `revision` - Minor clarification/update
- `append` - Adding new information
- `contradiction` - Changed preference/fact (creates new memory)

**Check version history:**
```
membrain(mode: "get", memoryId: "abc-123")
// Check evolution_history array
```

**Example evolution:**
```json
{
  "evolution_history": [
    {
      "version": 1,
      "content": "Uses React",
      "updated_at": "2024-01-15T10:00:00Z",
      "update_type": "revision"
    },
    {
      "version": 2,
      "content": "Uses React with TypeScript",
      "updated_at": "2024-01-20T14:30:00Z",
      "update_type": "append"
    }
  ]
}
```

---

### 9. GRAPH RELATIONSHIPS

Mem-Brain automatically creates **question-based links** between related memories.

**Example relationship:**
```
"Relationship: What is the opposite of microservices architecture? 
How does monolithic architecture compare to breaking apps into small services? 
Tell me about traditional versus distributed backend architectures."
```

**Relationship structure:**
- **source**: First memory
- **target**: Second memory
- **description**: Natural language question connecting them

**Why this matters:**
- Questions reveal the semantic connection
- Helps you understand how concepts relate
- Provides context for synthesis

**Finding relationships:**
```
// Relationships appear in search results with type: "relationship"
membrain(mode: "search", query: "architecture patterns")

// Or check linked_neighbors in get response
membrain(mode: "get", memoryId: "microservices-memory-id")
```

---

### 10. CLEANUP AND MAINTENANCE

**Preview cleanup:**
```
membrain(mode: "cleanup", dryRun: true)
```

**Actually clean:**
```
membrain(mode: "cleanup", dryRun: false)
```

**What cleanup removes:**
- Empty content memories
- "[No content]" memories
- Whitespace-only memories

**Check system health:**
```
membrain(mode: "stats")
```

**Healthy metrics:**
- Link density >1.0 (more links than memories)
- Low empty memory count
- Diverse tag distribution

---

### 11. ADVANCED PATTERNS

#### Pattern 1: Decision Tracking
```
// Document the decision
membrain(mode: "add",
  content: "Chose PostgreSQL over MongoDB because ACID compliance needed for financial data",
  tags: ["type.decision", "domain.database", "rationale"]
)

// Later search
membrain(mode: "search", query: "why postgresql", keywordFilter: "decision", k: 5)
```

#### Pattern 2: Error-Solution Pairs
```
// Document error
membrain(mode: "add",
  content: "Error: 'Cannot find module' in Node.js when using ES modules",
  tags: ["type.error", "domain.backend", "tech.nodejs"]
)

// Document solution
membrain(mode: "add",
  content: "Fix: Add 'type': 'module' to package.json for ES module support",
  tags: ["type.error-solution", "domain.backend", "tech.nodejs"]
)

// Search both
membrain(mode: "search", query: "cannot find module nodejs", k: 10)
```

#### Pattern 3: Progressive Learning
```
// Initial understanding
membrain(mode: "add",
  content: "Microservices: Breaking app into small independent services",
  tags: ["type.learned-pattern", "domain.backend", "confidence.experimental"]
)

// Deeper understanding (auto-linked)
membrain(mode: "add",
  content: "Microservices trade-offs: Independence vs distributed complexity, need service discovery",
  tags: ["type.learned-pattern", "domain.backend", "confidence.verified"]
)

// Search progression
membrain(mode: "search", query: "microservices complexity", k: 5)
```

#### Pattern 4: Scoped Knowledge Retrieval
```
// Get only user preferences
membrain(mode: "search", query: "preferences", keywordFilter: "^scope\\.user", k: 10)

// Get only project configs
membrain(mode: "search", query: "configuration", keywordFilter: "^scope\\.project", k: 10)

// Get recent learnings only
membrain(mode: "search", query: "learned", keywordFilter: "time\\.2026", k: 10)
```

---

## Best Practices (TESTED)

1. **Use atomic notes** - One fact per memory (Guardian links related ones)
2. **Tag consistently** - Use same tags for similar concepts
3. **Search before adding** - Avoid duplicates
4. **Use regex filters** - `keywordFilter` is incredibly powerful
5. **Trust the Guardian** - Auto-linking creates 120+ links automatically
6. **Review connections** - Check linked_neighbors and relationships
7. **Clean up regularly** - Run cleanup monthly
8. **Use descriptive content** - Make memories self-explanatory
9. **Check similarity scores** - Focus on 50%+ relevance
10. **Read relationship questions** - They provide crucial context
11. **Synthesize, don't retrieve** - Connect multiple memories for answers
12. **Use type tags** - `type.preference`, `type.project-config`, etc.
13. **Let auto-tags work** - Don't manually add scope.* or time.*
14. **Version tracking** - Check evolution_history for changes
15. **Multi-dimensional tagging** - Scope + Type + Domain + Tech

---

## Common Workflows

### Learning Session
```
1. membrain(mode: "search", query: "topic", k: 5)
2. [Learn from user/documentation]
3. membrain(mode: "add", content: "New insight", tags: ["learned", "topic"])
4. membrain(mode: "search", query: "related concepts", k: 5)
5. [Review connections]
```

### Project Setup
```
1. membrain(mode: "add", content: "Uses Bun runtime", tags: ["project", "tech"])
2. membrain(mode: "add", content: "bun run dev - start dev server", tags: ["project", "commands"])
3. membrain(mode: "add", content: "Never use 'any' type", tags: ["project", "conventions"])
4. [Query as needed]
   membrain(mode: "search", query: "how to start", keywordFilter: "project", k: 3)
```

### Debugging Session
```
1. [Encounter error]
2. membrain(mode: "search", query: "error message", k: 5)
3. [If solution found - great!]
4. [If new error]
   membrain(mode: "add", content: "Error: ...", tags: ["error", "domain"])
5. [After fixing]
   membrain(mode: "add", content: "Fix: ...", tags: ["error-solution", "domain"])
```

### Decision Documentation
```
1. membrain(mode: "add",
     content: "Decision: Use PostgreSQL. Rationale: ACID compliance needed.",
     tags: ["decision", "database", "rationale"])
2. [Later update if changed]
3. membrain(mode: "search", query: "database decision", k: 5)
4. [Review evolution_history if updated]
```

---

## Troubleshooting

**No relevant memories found?**
- Try broader search terms
- Use synonym keywords
- Check if memories have content (not "[No content]")
- Run cleanup to remove empty memories
- Verify tags exist: membrain(mode: "stats")

**Too many results?**
- Use keywordFilter to narrow scope
- Reduce k parameter
- Add more specific search terms

**Duplicate memories?**
- Guardian should prevent this
- Use cleanup if duplicates exist
- Search before adding new memories

**Low similarity scores?**
- Normal for broad queries
- Focus on 50%+ scores for relevance
- Try more specific search terms

**Relationships not showing?**
- Guardian creates them automatically (120+ links in system)
- They appear in search with type: "relationship"
- Check linked_neighbors in get response

**Empty memories in results?**
- Run: membrain(mode: "cleanup", dryRun: false)
- Use keywordFilter to exclude test tags: "^((?!test).)*$"

---

## Real Examples from Testing

**Example 1: Rich search results**
```
Query: "authentication security jwt"
Results:
- [76%] JWT tokens authenticate users in stateless systems (memory)
- [72%] Relationship: What authentication tokens are used with OAuth 2.0? (relationship)
- [55%] Relationship: What is OAuth 2.0 as an authorization framework? (relationship)
```

**Example 2: Comprehensive auto-tagging in action**
```
Input: content: "API Gateway pattern...", tags: ["architecture", "api", "patterns"]
Stored: tags: ["architecture", "api", "patterns", "scope.project",
              "time.year.2026", "time.2026", "time.month.2026-02", "time.month.february",
              "time.2026-02", "time.date.2026-02-25", "time.2026-02-25",
              "time.weekday.wednesday", "time.day.wednesday", "time.wednesday",
              "time.week.2026-05", "time.week.5", "time.quarter.2026-Q1", "time.Q1",
              "time.night", "time.season.winter", "time.winter"]
```

**Example 3: Complex regex filtering**
```
membrain(mode: "search", query: "design principles", keywordFilter: "ddd|solid|patterns", k: 5)
Results:
- [74%] SOLID principles guide object-oriented design
- [67%] Relationship: How do SOLID principles support Domain-Driven Design?
- [67%] Relationship: What are the SOLID principles in object-oriented design?
```

---

## Performance Insights

**Current metrics:**
- 99 memories stored
- 134 auto-generated links (1.35 density - excellent!)
- Search latency: <100ms
- Similarity scores: 0-100% (working!)
- Auto-tagging: scope + comprehensive temporal tags (17+ formats per memory)

**Optimal usage:**
- Keep memories atomic (one fact each)
- Use 2-4 tags per memory
- Trust Guardian for linking
- Clean up monthly

---

## Resources

- **Plugin docs**: See tool description for full API
- **Examples**: `docs/EXAMPLES.md` in plugin directory
- **Init command**: Run `/membrain-init` to explore codebase
- **Test queries**: Try the examples in this file

---

 **Last Updated**: Verified with 99 memories and 134 relationships
 **Version**: 2.2 (plugin-owned temporal tagging)
 **Test Coverage**: Plugin add/search/get verified; direct API behavior differentiated
