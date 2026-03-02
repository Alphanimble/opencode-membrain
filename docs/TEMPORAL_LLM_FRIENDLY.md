# LLM-Friendly + Regex-Friendly Temporal Tagging

## Problem Statement

Current temporal tags (`time.2026`, `time.Q1`) are regex-friendly but NOT LLM-friendly. Users naturally ask:
- "Remember this from last Wednesday?"
- "What did we discuss on March 15th?"
- "Show me things from yesterday morning"
- "What happened around 3pm last Tuesday?"

## Solution: Dual-Format Temporal Tags

### Format 1: Machine-Readable (Regex)
For programmatic queries

### Format 2: Human-Readable (LLM)
For natural language understanding

### Format 3: Hybrid
Both in one tag

---

## Recommended Implementation

### Auto-Generated Tags (All Added on Memory Creation)

#### Level 1: Date (ISO Format)
```
time.iso.2026-02-25          // YYYY-MM-DD (machine)
time.date.2026-02-25         // YYYY-MM-DD (human)
time.day.wednesday           // Day of week
time.week.2026-W09           // ISO week number
time.month.2026-02           // Year-Month
```

**Why ISO 8601?**
- Sorts correctly: 2026-02-25 < 2026-02-26 < 2026-03-01
- Unambiguous: No MM/DD vs DD/MM confusion
- Regex friendly: `time\.iso\.2026-02.*`
- LLM friendly: "February 25th, 2026"

#### Level 2: Time (Optional - for precise events)
```
time.hour.14                 // 24-hour format
time.time.14-30             // 2:30 PM
time.period.afternoon       // morning/afternoon/evening/night
```

#### Level 3: Relative (Human Context)
```
time.relative.today
time.relative.yesterday
time.relative.this-week
time.relative.last-week
time.relative.this-month
time.relative.last-month
```

#### Level 4: Semantic (Business Context)
```
time.semantic.workday        // Mon-Fri
time.semantic.weekend        // Sat-Sun
time.semantic.morning        // 6am-12pm
time.semantic.afternoon      // 12pm-6pm
time.semantic.evening        // 6pm-10pm
time.semantic.night          // 10pm-6am
```

---

## Complete Example Memory

**User says**: "Remember that we decided to use PostgreSQL on Wednesday afternoon"

**Auto-generated tags**:
```javascript
[
  // Machine-readable (regex)
  "time.iso.2026-02-25",           // 2026-02-25
  "time.week.2026-W09",            // Week 9
  "time.month.2026-02",            // February 2026
  "time.hour.14",                  // 2 PM
  
  // Human-readable (LLM)
  "time.day.wednesday",            // Wednesday
  "time.period.afternoon",         // afternoon
  "time.relative.today",           // or yesterday, this-week, etc.
  
  // Semantic (business)
  "time.semantic.workday",         // Mon-Fri
  "time.semantic.afternoon",       // 12pm-6pm
  
  // Scope & Type
  "scope.project",
  "type.decision",
  "domain.database"
]
```

---

## Query Scenarios

### Scenario 1: "Remember this from Wednesday?"

**User Query**: Natural language
**System Action**: 
```javascript
// Extract temporal references
const dayOfWeek = extractDayOfWeek(query); // "wednesday"

// Search
membrain(mode: "search",
  query: "postgres decision",
  keywordFilter: `time\.day\.${dayOfWeek}`,
  k: 10
)
```

**Matches**: All memories from any Wednesday

### Scenario 2: "What did we discuss on March 15th?"

```javascript
membrain(mode: "search",
  query: "discuss",
  keywordFilter: "time\.iso\.2026-03-15",
  k: 20
)
```

**Or with partial match**:
```javascript
keywordFilter: "time\.iso\.2026-03.*"  // All of March
```

### Scenario 3: "Show me things from yesterday morning"

```javascript
// Calculate yesterday
const yesterday = getYesterday(); // 2026-02-24

membrain(mode: "search",
  query: "",
  keywordFilter: `time\.iso\.${yesterday}|time\.period\.morning`,
  k: 20
)
```

### Scenario 4: "What happened around 3pm last Tuesday?"

```javascript
membrain(mode: "search",
  query: "",
  keywordFilter: "time\.day\.tuesday|time\.hour\.15",
  k: 10
)
```

### Scenario 5: "Show me last week's learnings"

```javascript
membrain(mode: "search",
  query: "learning",
  keywordFilter: "time\.relative\.last-week",
  k: 20
)
```

---

## Regex Patterns Reference

### Date Patterns

| Pattern | Matches | Example |
|---------|---------|---------|
| `time\.iso\.2026-02-25` | Exact date | 2026-02-25 |
| `time\.iso\.2026-02.*` | Whole month | All February |
| `time\.iso\.2026-0[2-4].*` | Feb-Apr | Q1 months |
| `time\.iso\.202[5-7].*` | Year range | 2025-2027 |

### Day of Week Patterns

| Pattern | Matches |
|---------|---------|
| `time\.day\.monday` | All Mondays |
| `time\.day\.(monday\|tuesday)` | Mon OR Tue |
| `time\.day\.(monday\|tuesday\|wednesday\|thursday\|friday)` | Weekdays |
| `time\.day\.(saturday\|sunday)` | Weekend |

### Time Patterns

| Pattern | Matches |
|---------|---------|
| `time\.hour\.0[9-17]` | 9am-5pm |
| `time\.period\.morning` | Morning |
| `time\.period\.(morning\|afternoon)` | Work hours |

### Relative Patterns

| Pattern | Matches |
|---------|---------|
| `time\.relative\.today` | Today only |
| `time\.relative\.(today\|yesterday)` | Last 2 days |
| `time\.relative\.(this-week\|last-week)` | Last 2 weeks |

### Semantic Patterns

| Pattern | Matches |
|---------|---------|
| `time\.semantic\.workday` | Mon-Fri |
| `time\.semantic\.weekend` | Sat-Sun |
| `time\.semantic\.(morning\|afternoon)` | Daytime |

---

## Advanced Queries

### Complex Temporal Queries

#### Work Hours This Week
```javascript
keywordFilter: "time\.relative\.this-week|time\.semantic\.workday|time\.period\.(morning|afternoon)"
```

#### Weekend Learning
```javascript
keywordFilter: "time\.semantic\.weekend|type\.learned-pattern"
```

#### All Wednesday Meetings
```javascript
keywordFilter: "time\.day\.wednesday|type\.meeting"
```

#### Last Month's Decisions
```javascript
keywordFilter: "time\.relative\.last-month|type\.decision"
```

#### Q1 2026 Architecture Work
```javascript
keywordFilter: "time\.iso\.2026-0[1-3].*|type\.architecture"
```

---

## Implementation Strategy

### Auto-Tag Generation Code

```typescript
function generateTemporalTags(date: Date = new Date()): string[] {
  const tags: string[] = [];
  
  // ISO date components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const isoDate = `${year}-${month}-${day}`;
  
  // ISO week
  const weekNum = getISOWeek(date);
  const isoWeek = `${year}-W${String(weekNum).padStart(2, '0')}`;
  
  // Day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = days[date.getDay()];
  
  // Hour (24h)
  const hour = date.getHours();
  
  // Period of day
  let period: string;
  if (hour >= 6 && hour < 12) period = 'morning';
  else if (hour >= 12 && hour < 18) period = 'afternoon';
  else if (hour >= 18 && hour < 22) period = 'evening';
  else period = 'night';
  
  // Semantic
  const isWorkday = date.getDay() >= 1 && date.getDay() <= 5;
  
  // Generate tags
  tags.push(`time.iso.${isoDate}`);           // time.iso.2026-02-25
  tags.push(`time.week.${isoWeek}`);          // time.week.2026-W09
  tags.push(`time.month.${year}-${month}`);   // time.month.2026-02
  tags.push(`time.day.${dayOfWeek}`);         // time.day.wednesday
  tags.push(`time.hour.${hour}`);             // time.hour.14
  tags.push(`time.period.${period}`);         // time.period.afternoon
  tags.push(`time.semantic.${isWorkday ? 'workday' : 'weekend'}`);
  
  return tags;
}

// Relative tags (updated periodically)
function generateRelativeTags(date: Date = new Date()): string[] {
  return [
    'time.relative.today',
    // 'time.relative.yesterday', // Calculate and add if needed
    // 'time.relative.this-week',
    // etc.
  ];
}
```

### Plugin Integration

```typescript
// In index.ts, add mode
membrain(mode: "add", content: "...", tags: [...])

// Auto-add temporal tags
const temporalTags = generateTemporalTags(new Date());
const relativeTags = generateRelativeTags(new Date());
const allTags = [...userTags, ...temporalTags, ...relativeTags];

await membrainClient.addMemory(content, allTags, category);
```

---

## Natural Language Processing

### Extracting Temporal References

```typescript
function extractTemporalFromQuery(query: string): TemporalQuery {
  const patterns = {
    // Days of week
    'monday': 'time.day.monday',
    'tuesday': 'time.day.tuesday',
    'wednesday': 'time.day.wednesday',
    'thursday': 'time.day.thursday',
    'friday': 'time.day.friday',
    'saturday': 'time.day.saturday',
    'sunday': 'time.day.sunday',
    
    // Relative
    'today': 'time.relative.today',
    'yesterday': 'time.relative.yesterday',
    'this week': 'time.relative.this-week',
    'last week': 'time.relative.last-week',
    'this month': 'time.relative.this-month',
    'last month': 'time.relative.last-month',
    
    // Periods
    'morning': 'time.period.morning',
    'afternoon': 'time.period.afternoon',
    'evening': 'time.period.evening',
    'night': 'time.period.night',
    
    // Semantic
    'weekday': 'time.semantic.workday',
    'weekend': 'time.semantic.weekend',
    'workday': 'time.semantic.workday',
    
    // ISO dates (extracted from "2026-03-15" or "March 15th, 2026")
    isoDate: extractISODate(query), // Custom function
  };
  
  // Match patterns
  const matchedTags: string[] = [];
  for (const [pattern, tag] of Object.entries(patterns)) {
    if (query.toLowerCase().includes(pattern)) {
      matchedTags.push(tag);
    }
  }
  
  return { tags: matchedTags };
}
```

### Usage in Search

```typescript
// User: "Remember this from last Wednesday afternoon?"
const query = "last Wednesday afternoon";
const temporal = extractTemporalFromQuery(query);
// Returns: { tags: ['time.relative.last-week', 'time.day.wednesday', 'time.period.afternoon'] }

membrain(mode: "search",
  query: "",
  keywordFilter: temporal.tags.join('|'),
  k: 10
);
```

---

## Storage Impact Analysis

### Current (2 tags)
- `time.2026`
- `time.Q1`

### Proposed (7-10 tags)
- `time.iso.2026-02-25`
- `time.week.2026-W09`
- `time.month.2026-02`
- `time.day.wednesday`
- `time.hour.14`
- `time.period.afternoon`
- `time.semantic.workday`
- `time.relative.today`

**Trade-offs**:
- ✅ Much more powerful temporal queries
- ✅ Natural language compatible
- ✅ Both regex and LLM friendly
- ❌ Slightly more storage per memory (7-10 vs 2 tags)
- ❌ More complex tag management

**Recommendation**: Worth it for the query power

---

## Comparison with Other Systems

### Supermemory
```
Fixed: createdAt: "2026-02-25T14:30:00Z"
Queries: Limited to exact timestamps or date ranges
```

### Mem-Brain (Current)
```
time.2026, time.Q1
Queries: Year/quarter only
```

### Mem-Brain (Proposed)
```
time.iso.2026-02-25, time.day.wednesday, time.period.afternoon, etc.
Queries: 
  - "Show me Wednesday afternoons"
  - "What happened last week?"
  - "Morning meetings in February"
  - "Weekend learnings"
```

**Winner**: Proposed system handles natural language temporal queries

---

## Migration Plan

### Phase 1: Add New Tags (Backward Compatible)
```typescript
// Keep existing tags
const existingTags = ['time.2026', 'time.Q1'];

// Add new format
const newTags = [
  'time.iso.2026-02-25',
  'time.day.wednesday',
  'time.week.2026-W09',
  // ...
];

// All tags
const allTags = [...existingTags, ...newTags];
```

### Phase 2: Deprecate Old Format (Optional)
After 6 months, remove `time.2026` and `time.Q1` in favor of:
- `time.iso.2026` (year)
- `time.month.2026-Q1` (quarter)

### Phase 3: Full Migration
Update all queries to use new format

---

## Real-World Test Cases

### Test 1: "What did we do last Wednesday?"
```javascript
// Extract: day=wednesday, relative=last-week
membrain(mode: "search",
  query: "",
  keywordFilter: "time\.day\.wednesday|time\.relative\.last-week"
);
```
**Expected**: All memories from last Wednesday

### Test 2: "Show me morning work from February"
```javascript
membrain(mode: "search",
  query: "",
  keywordFilter: "time\.period\.morning|time\.iso\.2026-02.*|time\.semantic\.workday"
);
```
**Expected**: Morning memories from Feb 2026, weekdays only

### Test 3: "Remember this from the weekend"
```javascript
membrain(mode: "search",
  query: "",
  keywordFilter: "time\.semantic\.weekend"
);
```
**Expected**: All Saturday/Sunday memories

---

## Summary

### Recommended Format

**Core Tags** (always added):
```
time.iso.YYYY-MM-DD      // Machine: 2026-02-25
time.day.DAYOFWEEK       // Human: wednesday
time.week.YYYY-WNN       // Machine: 2026-W09
time.month.YYYY-MM       // Machine: 2026-02
time.semantic.WORKDAY    // Human: workday/weekend
```

**Optional Tags** (configurable):
```
time.hour.HH             // Machine: 14
time.period.PERIOD       // Human: morning/afternoon/evening/night
time.relative.RELATIVE   // Human: today/yesterday/this-week
```

### Key Benefits

1. **LLM-Friendly**: "wednesday", "afternoon", "this week" are human-readable
2. **Regex-Friendly**: `time\.day\.wednesday` is machine-parseable
3. **Natural Language**: Supports "last Wednesday afternoon" type queries
4. **Flexible Granularity**: From year to hour level
5. **Semantic Understanding**: Workday/weekend, morning/evening
6. **ISO Standard**: `time.iso.2026-02-25` follows international standards

### Implementation Priority

**Must Have** (Phase 1):
- `time.iso.YYYY-MM-DD`
- `time.day.DAYOFWEEK`
- `time.semantic.workday/weekend`

**Should Have** (Phase 2):
- `time.hour.HH`
- `time.period.PERIOD`
- `time.relative.RELATIVE`

**Nice to Have** (Phase 3):
- `time.week.YYYY-WNN`
- `time.month.YYYY-MM`

---

**This format makes Mem-Brain the ONLY memory system that truly understands natural language temporal references while remaining fully regex-queryable.** 🎯
