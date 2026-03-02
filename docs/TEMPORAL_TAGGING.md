# Temporal Tagging Strategy for Mem-Brain

## Overview

Time-based filtering is one of Mem-Brain's most powerful features when combined with regex. This guide covers optimal temporal formats that are regex-friendly for advanced time-based queries.

## Current Implementation

The plugin currently auto-adds:
- `time.2026` (year)
- `time.Q1` (quarter)

## Recommended Temporal Format Hierarchy

### Level 1: Year (Required)
```
time.2024
time.2025
time.2026
```
**Regex**: `time\.202[4-9]` (years 2024-2029)

### Level 2: Quarter (Recommended)
```
time.2026.Q1  // Jan-Mar
time.2026.Q2  // Apr-Jun
time.2026.Q3  // Jul-Sep
time.2026.Q4  // Oct-Dec
```
**Regex**: `time\.2026\.Q[1-4]` (all quarters in 2026)

### Level 3: Month (Optional)
```
time.2026.01  // January
time.2026.02  // February
time.2026.03  // March
...
time.2026.12  // December
```
**Regex**: `time\.2026\.(0[1-9]|1[0-2])` (months 01-12)

### Level 4: Week (Optional)
```
time.2026.W01  // Week 1
time.2026.W15  // Week 15
time.2026.W52  // Week 52
```
**Regex**: `time\.2026\.W([0-4][0-9]|5[0-2])` (weeks 01-52)

### Level 5: Day (Optional - for specific events)
```
time.2026.03.15  // March 15, 2026
time.2026.12.25  // December 25, 2026
```
**Regex**: `time\.2026\.(0[1-9]|1[0-2])\.(0[1-9]|[12][0-9]|3[01])`

## Alternative Temporal Formats

### ISO 8601 Style (Recommended for Precision)
```
time.2026-03-15      // Specific date
time.2026-03         // Month
time.2026-W11        // Week 11
```

**Advantages**:
- Internationally recognized standard
- Sorts correctly lexicographically
- Clear hierarchy: year → month → day

**Regex Examples**:
```regex
// All March 2026 memories
time\.2026-03.*

// First quarter 2026 (Jan-Mar)
time\.2026-0[1-3].*

// Specific date range
memories tagged between 2026-03-01 and 2026-03-31
```

### Compact Format (Space Efficient)
```
time.20260315   // March 15, 2026
time.202603     // March 2026
time.2026Q1     // Q1 2026
```

**Advantages**:
- Shorter tags
- Still sortable
- Easy to parse

### Relative Time Tags (For Active Work)
```
time.today
time.yesterday
time.this-week
time.this-month
time.this-quarter
time.this-year
```

**Use Case**: Auto-update these tags periodically or use for session-only memories.

### Seasonal Tags (Business Context)
```
time.2026.sprint-1
time.2026.sprint-2
time.2026.sprint-3
time.2026.milestone-alpha
time.2026.milestone-beta
time.2026.release-v1
```

## Advanced Temporal Queries

### Query Patterns

#### 1. Recent Memories (Last 3 Months)
```
keywordFilter: "time\.2026\.(0[1-3])"
// Matches: time.2026.01, time.2026.02, time.2026.03
```

#### 2. Specific Quarter
```
keywordFilter: "time\.2026\.Q2"
// Matches: time.2026.Q2
```

#### 3. Year-to-Date
```
keywordFilter: "time\.2026.*"
// Matches: time.2026, time.2026.Q1, time.2026.03, etc.
```

#### 4. Multiple Years
```
keywordFilter: "time\.202[4-6].*"
// Matches: 2024, 2025, 2026 with any suffix
```

#### 5. Specific Month Range
```
keywordFilter: "time\.2026\.(0[3-5])"
// Matches: March, April, May 2026
```

#### 6. Exclude Recent (Archive Query)
```
keywordFilter: "time\.202[0-5].*"
// Matches: 2020-2025 (excludes 2026)
```

#### 7. Week-Based Sprints
```
keywordFilter: "time\.2026\.W(0[1-9]|[1-4][0-9])"
// Matches: Weeks 01-49 of 2026
```

### Complex Temporal Queries

#### Current Quarter Only
```
keywordFilter: "time\.2026\.Q1"
query: "recent learnings"
k: 10
```

#### Last Two Quarters
```
keywordFilter: "time\.2026\.Q[34]"
query: "architecture decisions"
k: 20
```

#### Before Current Year
```
keywordFilter: "time\.202[0-5].*"
query: "deprecated patterns"
k: 10
```

#### Specific Date Window
```
// For ISO format: time.2026-03-15
keywordFilter: "time\.2026-03-(0[1-9]|[12][0-9]|3[01])"
query: "march updates"
k: 10
```

## Implementation Recommendations

### Auto-Tag Strategy (Plugin Enhancement)

```typescript
// Current implementation (Level 1-2)
const now = new Date();
autoTags.push(`time.${now.getFullYear()}`);
autoTags.push(`time.${now.getFullYear()}.Q${Math.floor(now.getMonth() / 3) + 1}`);

// Enhanced (Level 1-3)
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const quarter = Math.floor(now.getMonth() / 3) + 1;

autoTags.push(`time.${year}`);                    // time.2026
autoTags.push(`time.${year}.Q${quarter}`);        // time.2026.Q1
autoTags.push(`time.${year}.${month}`);           // time.2026.03
```

### Tag Priority Levels

**Level 1 (Always)**: Year
- `time.2026`

**Level 2 (Recommended)**: Quarter
- `time.2026.Q1`

**Level 3 (Optional)**: Month
- `time.2026.03`

**Level 4 (On-demand)**: Specific dates
- `time.2026.03.15`
- `time.2026-03-15`

### Storage Efficiency

**Compact vs Verbose**:
```
// Compact (recommended)
time.2026Q1
time.202603
time.20260315

// Verbose (human readable)
time.2026.Q1
time.2026.03
time.2026.03.15
```

**Recommendation**: Use dot notation for clarity and regex compatibility.

## Real-World Usage Examples

### Example 1: Quarterly Review
```
membrain(mode: "search", 
  query: "what did we learn", 
  keywordFilter: "time\.2026\.Q1",
  k: 20
)
```

### Example 2: Year-End Retrospective
```
membrain(mode: "search",
  query: "major decisions",
  keywordFilter: "time\.2025.*",
  k: 50
)
```

### Example 3: Recent Active Work
```
membrain(mode: "search",
  query: "current architecture",
  keywordFilter: "time\.2026\.(0[1-3])|time\.2026\.Q1",
  k: 10
)
```

### Example 4: Archive Old Memories
```
// Find memories older than 1 year
membrain(mode: "search",
  query: "",
  keywordFilter: "time\.202[0-5].*",
  k: 100
)
// Then: membrain(mode: "delete", memoryIds: [...])
```

### Example 5: Sprint-Based Filtering
```
membrain(mode: "search",
  query: "completed features",
  keywordFilter: "time\.2026\.sprint-[1-3]",
  k: 20
)
```

## Comparison with Supermemory

**Supermemory Approach**:
- Fixed temporal fields: createdAt, updatedAt
- Rigid structure
- Limited query capability

**Mem-Brain Tag Approach**:
```
// Flexible temporal tagging
time.2026                    // Year
time.2026.Q1                // Quarter
time.2026.03                // Month
time.2026.03.15            // Day
time.2026.sprint-3         // Custom sprint

// Regex-powered queries
keywordFilter: "time\.2026.*"           // All 2026
keywordFilter: "time\.2026\.Q[12]"      // H1 2026
keywordFilter: "time\.202[4-6].*"        // 3-year window
```

**Advantage**: Mem-Brain's tag approach allows ANY temporal granularity without schema changes.

## Best Practices

### 1. Consistent Format
Choose ONE format and stick to it:
- ✅ `time.2026.Q1` (recommended)
- ❌ Mixing `time.2026.Q1` and `time.2026-03-15`

### 2. Auto-Tagging
Let the plugin handle temporal tags:
- Don't manually add `time.2026`
- Focus on domain-specific tags
- Trust auto-tagging for temporal

### 3. Query Flexibility
Use regex for powerful temporal queries:
- Use `.*` for wildcards
- Use `|` for OR conditions
- Use `[0-9]` for ranges

### 4. Temporal Granularity
Start with year + quarter, add more only when needed:
- Most queries: Year level
- Sprint planning: Quarter level
- Debugging: Month/day level

### 5. Archive Strategy
Use temporal tags for cleanup:
```
// Find old memories
keywordFilter: "time\.202[0-3].*"

// Find recent only
keywordFilter: "time\.202[5-6].*"
```

## Migration Path

### From Current (Level 2)
Current: `time.2026`, `time.Q1`

### To Enhanced (Level 3)
New: `time.2026`, `time.2026.Q1`, `time.2026.03`

**Backward Compatibility**:
- Old queries still work: `keywordFilter: "time\.2026"`
- New queries possible: `keywordFilter: "time\.2026\.03"`

### Migration Script
```typescript
// For existing memories, add month-level tags
const memories = await getAllMemories();
for (const memory of memories) {
  if (memory.tags?.includes("time.2026")) {
    // Add quarter tag if missing
    if (!memory.tags.some(t => t.match(/time\.2026\.Q[1-4]/))) {
      await addTag(memory.id, "time.2026.Q1"); // Determine from created_at
    }
  }
}
```

## Summary

**Recommended Format**: `time.YYYY.QN` (e.g., `time.2026.Q1`)

**Key Benefits**:
1. **Regex-friendly**: Easy pattern matching
2. **Hierarchical**: Year → Quarter → Month → Day
3. **Sortable**: Lexicographic order works
4. **Flexible**: Any granularity without schema changes
5. **Backward compatible**: Can add levels incrementally

**Most Useful Regex Patterns**:
```regex
time\.2026.*              # All 2026
time\.2026\.Q[1-4]       # Specific quarter
time\.202[4-6].*          # Year range
time\.2026\.(0[1-6])      # First half months
time\.2026\.W([0-2][0-9]) # First 30 weeks
```

**Implementation Priority**:
1. ✅ Year (already implemented)
2. ✅ Quarter (already implemented)
3. 🟡 Month (recommended enhancement)
4. 🟢 Day/Custom (on-demand)
