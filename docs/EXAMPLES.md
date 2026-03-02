# Mem-Brain Usage Examples

## Basic Operations

### Adding Memories

```typescript
// Simple memory with tags
membrain(mode: "add", content: "User prefers dark mode", tags: ["preference", "ui"])

// Memory with category
membrain(mode: "add", content: "Project uses React 18 with TypeScript", tags: ["project", "frontend", "react"], category: "tech")

// Configuration detail
membrain(mode: "add", content: "API rate limit is 1000 requests/hour", tags: ["project", "api", "config"])

// Best practice
membrain(mode: "add", content: "Never use \`any\` type - strict TypeScript", tags: ["project", "conventions", "typescript"])

// Decision with rationale
membrain(mode: "add", content: "Chose PostgreSQL over MongoDB for ACID compliance", tags: ["decision", "database", "rationale"])
```

### Searching with Regex Filtering

#### Find all frontend technologies
```typescript
membrain(mode: "search", query: "frontend frameworks", keywordFilter: "react|vue|angular", k: 10)
```

#### Search authentication methods
```typescript
membrain(mode: "search", query: "how to authenticate users", keywordFilter: "jwt|oauth|security", k: 5)
```

#### Find database options
```typescript
membrain(mode: "search", query: "database for my project", keywordFilter: "mongo|postgre|redis|sql|nosql", k: 10)
```

#### Architecture patterns
```typescript
membrain(mode: "search", query: "scaling strategy", keywordFilter: "microservices|kubernetes|load-balancing", k: 5)
```

#### Design patterns
```typescript
membrain(mode: "search", query: "design patterns I should know", keywordFilter: "ddd|solid|factory|singleton|observer", k: 10)
```

#### Complex regex patterns
```typescript
// Match all hyphenated tags
membrain(mode: "search", query: "technologies", keywordFilter: "^[a-z]+(-[a-z]+)+$", k: 10)

// Match anything starting with "api"
membrain(mode: "search", query: "api documentation", keywordFilter: "api.*", k: 5)

// Combine multiple patterns
membrain(mode: "search", query: "infrastructure", keywordFilter: "docker|kubernetes|aws|gcp|azure", k: 10)
```

### Retrieving Memories

```typescript
// Single memory by ID
membrain(mode: "get", memoryId: "abc-123")

// Multiple memories by IDs (array)
membrain(mode: "get", memoryIds: ["abc-123", "def-456", "ghi-789"])

// Multiple memories by IDs (comma-separated string)
membrain(mode: "get", memoryIds: "abc-123, def-456, ghi-789")
```

### Deleting Memories

```typescript
// Delete by specific ID
membrain(mode: "delete", memoryId: "abc-123")

// Delete by tags
membrain(mode: "delete", tags: ["temp"])
membrain(mode: "delete", tags: ["temp", "test"])

// Delete by category
membrain(mode: "delete", category: "draft")

// Delete by both tags and category
membrain(mode: "delete", tags: ["temp"], category: "test")
```

### Cleaning Up Empty Memories

```typescript
// Preview what would be deleted (dry run)
membrain(mode: "cleanup", dryRun: true)

// Actually delete empty memories
membrain(mode: "cleanup", dryRun: false)
```

### Getting Statistics

```typescript
membrain(mode: "stats")
```

## Advanced Tag Strategies

### Hierarchical Tags

```typescript
// Create hierarchical memory
membrain(mode: "add", 
  content: "React hooks best practices", 
  tags: ["tech.frontend", "tech.frontend.react", "tech.frontend.react.hooks"]
)

// Search all frontend
membrain(mode: "search", query: "frontend", keywordFilter: "tech.frontend.*", k: 10)

// Search specifically React
membrain(mode: "search", query: "react patterns", keywordFilter: "tech.frontend.react", k: 5)
```

### Multi-Dimensional Tagging

```typescript
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

// Search by multiple dimensions
membrain(mode: "search", query: "backend patterns", keywordFilter: "scope.project|domain.backend", k: 10)
membrain(mode: "search", query: "active architecture", keywordFilter: "status.active|type.architecture", k: 5)
```

### Temporal Tags

```typescript
membrain(mode: "add",
  content: "New React 19 features",
  tags: ["react", "frontend", "time.2024", "time.Q1"]
)

// Find all 2024 memories
membrain(mode: "search", query: "recent learnings", keywordFilter: "time.2024", k: 20)

// Find Q1 2024 specifically
membrain(mode: "search", query: "Q1 learnings", keywordFilter: "time.2024|time.Q1", k: 10)
```

### Confidence and Source Tags

```typescript
// Verified knowledge
membrain(mode: "add",
  content: "PostgreSQL supports JSONB for document storage",
  tags: ["scope.project", "type.fact", "domain.database", "confidence.verified", "source.docs"]
)

// Experimental/WIP
membrain(mode: "add",
  content: "Trying out Bun for faster builds",
  tags: ["scope.project", "type.experiment", "domain.devops", "confidence.experimental", "source.experience"]
)

// Research-based
membrain(mode: "add",
  content: "GraphQL reduces over-fetching compared to REST",
  tags: ["scope.user", "type.learned-pattern", "domain.backend", "confidence.verified", "source.research"]
)
```

## Real-World Workflows

### Learning Session

```typescript
// 1. Search existing knowledge
membrain(mode: "search", query: "topic", k: 5)

// 2. Learn new things...

// 3. Save insights
membrain(mode: "add", content: "New insight learned", tags: ["learned", "topic"])

// 4. Search and review connections
membrain(mode: "search", query: "related topic", keywordFilter: "learned", k: 10)
```

### Project Configuration

```typescript
// 1. Add tech stack
membrain(mode: "add", content: "Uses Bun runtime", tags: ["project", "tech"])

// 2. Add build commands
membrain(mode: "add", content: "bun run build && bun test", tags: ["project", "commands"])

// 3. Add conventions
membrain(mode: "add", content: "Never use any type", tags: ["project", "conventions"])

// 4. Query when needed
membrain(mode: "search", query: "build command", keywordFilter: "project", k: 3)
```

### Decision Tracking

```typescript
// 1. Document decision
membrain(mode: "add", content: "Chose PostgreSQL over MongoDB because ACID compliance is required", tags: ["decision", "database", "rationale"])

// 2. Later, update if changed
membrain(mode: "add", content: "Switched to MongoDB for flexibility - PostgreSQL too rigid", tags: ["decision", "database", "evolution", "rationale"])

// 3. Review decision history
membrain(mode: "search", query: "database decision", keywordFilter: "decision|database", k: 5)
```

### Code Review Knowledge

```typescript
// Capture review feedback
membrain(mode: "add", content: "PR #123: Need to add error handling for edge cases", tags: ["review", "pr-123", "feedback"])

// Track patterns
membrain(mode: "add", content: "Common issue: forgetting to validate inputs", tags: ["review", "common-issues", "validation"])

// Search during reviews
membrain(mode: "search", query: "validation patterns", keywordFilter: "review|common-issues", k: 5)
```

### Debugging Knowledge Base

```typescript
// Log error patterns
membrain(mode: "add", content: "Error: ECONNREFUSED usually means service not running", tags: ["error", "debugging", "network"])

// Document solutions
membrain(mode: "add", content: "Fix for CORS errors: Add cors() middleware", tags: ["error", "cors", "fix"])

// Quick reference
membrain(mode: "search", query: "database connection error", keywordFilter: "error|debugging", k: 10)
```

## Pro Tips

1. **Use atomic notes**: One fact per memory
   - ✅ Good: "API rate limit is 1000 requests/hour"
   - ❌ Bad: "User said they like the app and the API has rate limits"

2. **Tag consistently**: Use same tags for similar concepts
   - Create a personal tag dictionary
   - Use `scope.user` vs `scope.project` to distinguish
   - Use `type.*` for categorization

3. **Search before adding**: Avoid duplicates
   ```typescript
   membrain(mode: "search", query: "dark mode", k: 3)
   // Check results first, then add if not found
   ```

4. **Use regex filters**: Narrow results precisely
   ```typescript
   // Instead of multiple searches
   membrain(mode: "search", query: "frontend", keywordFilter: "react|vue|angular", k: 10)
   ```

5. **Trust the Guardian**: Let it handle linking
   - Don't manually manage memory relationships
   - The Guardian auto-links related memories
   - Check `linked_neighbors` in get responses

6. **Review connections**: Check linked memories for insights
   ```typescript
   membrain(mode: "get", memoryId: "abc-123")
   // Review the linked_neighbors array
   ```

7. **Clean up regularly**: Remove outdated or empty memories
   ```typescript
   membrain(mode: "cleanup", dryRun: true)  // Preview first
   membrain(mode: "cleanup", dryRun: false) // Then delete
   ```

8. **Use descriptive content**: Make memories self-explanatory
   - ✅ Good: "Build command: bun run build && bun test"
   - ❌ Bad: "Build stuff"

9. **Add temporal context**: When relevant, include time info
   - "As of 2024, React 19 introduces..."
   - "Currently using Node 20..."

10. **Combine search modes**: Semantic + regex for precision
    ```typescript
    // Find design patterns specifically for backend
    membrain(mode: "search", query: "design patterns", keywordFilter: "pattern|domain.backend", k: 5)
    ```
