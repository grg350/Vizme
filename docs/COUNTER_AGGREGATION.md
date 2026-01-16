# Counter Metric Aggregation Fix

## Overview

This document describes the fix implemented to properly handle counter metric accumulation when using Prometheus Pushgateway.

**Date:** 2024  
**File Changed:** `backend/src/routes/metrics.routes.js`  
**Type:** Bug Fix

---

## Problem Statement

### Issue

When users clicked "Add to Cart" multiple times, the metric value in Grafana always showed `1` instead of accumulating (1, 2, 3, 4, 5...).

### Root Cause

**Prometheus Pushgateway replaces metrics** with the same name and labels. This is by design - Pushgateway is meant for batch jobs that push their final state, not for accumulating values.

**What was happening:**
1. Click 1: Push `add_to_cart{product_id="3"} 1` → Pushgateway stores: `1`
2. Click 2: Push `add_to_cart{product_id="3"} 1` → Pushgateway **replaces** previous → stores: `1` (not `2`)
3. Click 3: Push `add_to_cart{product_id="3"} 1` → Pushgateway **replaces** previous → stores: `1` (not `3`)

**Result:** Value always stays at `1`, never increases.

### Why This Happens

Pushgateway's behavior:
- Each push with the same metric name + labels **replaces** the previous value
- It doesn't automatically increment counters
- It's designed for jobs that push their final cumulative value

---

## Solution

### Approach: Backend Aggregation

The backend now **aggregates counter values** before pushing to Pushgateway:

1. **Track cumulative values** in memory for each unique counter metric
2. **Add incoming value** to the cumulative total
3. **Push cumulative value** to Pushgateway

This way, Pushgateway receives increasing values (1, 2, 3, 4, 5...) instead of always `1`.

### How It Works

```
Click 1: Client sends value=1
  → Backend: cumulative = 0 + 1 = 1
  → Pushgateway receives: 1 ✅

Click 2: Client sends value=1
  → Backend: cumulative = 1 + 1 = 2
  → Pushgateway receives: 2 ✅

Click 3: Client sends value=1
  → Backend: cumulative = 2 + 1 = 3
  → Pushgateway receives: 3 ✅
```

---

## Implementation Details

### Code Changes

**File:** `backend/src/routes/metrics.routes.js`

**Added:**
```javascript
// In-memory store for counter aggregation
// Key format: `${userId}_${metricName}_${labelString}`
// Value: cumulative counter value
const counterAggregation = new Map();
```

**Modified `pushToPrometheus` function:**
```javascript
const pushToPrometheus = async (metric, userId) => {
  let { name, type, value, labels } = metric;

  // For counter metrics, aggregate values before pushing
  if (type === 'counter') {
    // Create unique key for this metric+labels combination
    const labelString = Object.entries(labels || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    
    const aggregationKey = `${userId}_${name}_${labelString}`;
    
    // Get current cumulative value or start at 0
    const currentValue = counterAggregation.get(aggregationKey) || 0;
    
    // Add new value to cumulative
    const cumulativeValue = currentValue + value;
    
    // Store new cumulative value
    counterAggregation.set(aggregationKey, cumulativeValue);
    
    // Use cumulative value for pushing
    value = cumulativeValue;
  }

  // ... rest of push logic
};
```

### Key Features

1. **Counter-Specific**: Only aggregates counters, gauges use values as-is
2. **Unique Keys**: Each metric+labels combination has its own counter
3. **Per-User**: Aggregation is scoped by `userId`
4. **In-Memory**: Fast lookup using Map data structure

---

## How It Works

### Aggregation Key Format

```
${userId}_${metricName}_${sortedLabelString}
```

**Example:**
- User ID: `2`
- Metric: `add_to_cart`
- Labels: `{product_id: "3", category: "Fashion"}`
- Key: `2_add_to_cart_category=Fashion,product_id=3`

**Why sorted labels?** Ensures consistent keys regardless of label order.

### Flow Diagram

```
1. Client sends: { name: "add_to_cart", type: "counter", value: 1, labels: {...} }
   
2. Backend checks: Is type === "counter"?
   └─> Yes: Aggregate
       ├─> Create aggregation key
       ├─> Get current cumulative value (or 0)
       ├─> Add: cumulative = current + 1
       └─> Store new cumulative value
   
3. Backend pushes: cumulative value (1, 2, 3, ...) to Pushgateway
   
4. Pushgateway stores: Cumulative value (replaces previous)
   
5. Prometheus scrapes: Sees increasing values ✅
```

---

## Benefits

### 1. Correct Counter Behavior
- Counters now accumulate properly
- Values increase: 1 → 2 → 3 → 4 → 5
- Matches Prometheus counter semantics

### 2. Works with Pushgateway
- Handles Pushgateway's replace behavior
- No changes needed to Pushgateway configuration

### 3. Per-Metric Aggregation
- Each metric+labels combination tracked separately
- Multiple products tracked independently

### 4. Performance
- O(1) lookup using Map
- Fast in-memory operations

---

## Limitations

### 1. In-Memory Storage
- **Issue**: Aggregation map is lost on server restart
- **Impact**: Counters reset to 0 after restart
- **Future Fix**: Could use Redis or database for persistence

### 2. Single Server
- **Issue**: Only works on single server instance
- **Impact**: Won't work with multiple backend instances
- **Future Fix**: Use shared storage (Redis) for aggregation

### 3. Memory Usage
- **Issue**: Map grows with unique metric combinations
- **Impact**: Minimal for typical use cases
- **Future Fix**: Add TTL or cleanup for old metrics

---

## Testing

### Test Cases

1. **Single Product, Multiple Clicks**
   - Click "Add to Cart" 5 times on same product
   - Expected: Values 1, 2, 3, 4, 5 in Grafana ✅

2. **Multiple Products**
   - Click product A 3 times
   - Click product B 2 times
   - Expected: Product A = 3, Product B = 2 ✅

3. **Gauge Metrics (No Aggregation)**
   - Send gauge metric with value 10
   - Send gauge metric with value 20
   - Expected: Shows 20 (replaces, doesn't aggregate) ✅

4. **Server Restart**
   - Click 3 times (values: 1, 2, 3)
   - Restart server
   - Click 1 time
   - Expected: Value resets to 1 (aggregation lost) ⚠️

### Verification

1. **Check Grafana:**
   - Query: `add_to_cart`
   - Should see increasing values over time

2. **Check Prometheus:**
   ```promql
   # Should show increasing values
   add_to_cart{product_id="3"}
   ```

3. **Check Backend Logs:**
   - No errors about aggregation
   - Successful pushes to Pushgateway

---

## Impact on Existing Functionality

### Counter Metrics
- ✅ **Fixed**: Now accumulate correctly
- ✅ **Behavior**: Values increase with each event

### Gauge Metrics
- ✅ **Unchanged**: Still work as before
- ✅ **Behavior**: Each push replaces previous value (correct for gauges)

### Histogram/Summary Metrics
- ✅ **Unchanged**: Not affected by this change

---

## Future Improvements

### 1. Persistent Storage
- Store aggregation in Redis or database
- Survives server restarts
- Enables multi-server deployments

### 2. TTL/Cleanup
- Remove old aggregation keys
- Prevent memory growth
- Configurable retention period

### 3. Distributed Aggregation
- Use Redis for shared state
- Support multiple backend instances
- Better scalability

### 4. Metrics for Aggregation
- Track aggregation map size
- Monitor memory usage
- Alert on high growth

---

## Related Files

- `backend/src/routes/metrics.routes.js` - Main implementation
- `docs/METRIC_TYPE_VALIDATION.md` - Related type validation fix

---

## Summary

This fix ensures that counter metrics accumulate correctly when using Prometheus Pushgateway. The backend now aggregates counter values before pushing, maintaining cumulative totals that increase with each event.

**Result**: Counter metrics now display correctly in Grafana, showing increasing values (1, 2, 3, 4, 5...) instead of always staying at 1.

---

## Changelog

- **2024**: Initial implementation of counter aggregation
  - Added in-memory aggregation map
  - Implemented cumulative value tracking
  - Counter metrics now accumulate correctly

