---
title: Snake Battle Royale: High-Frequency Game Server optimization project 3/x
date: September 15, 2025
readTime: 11 min read
summary: L3 Cache Thrashing + TinyDeque
---

# Snake Battle Royale: High-Frequency Game Server optimization project (Part 3)

*Hot Path optimization: When cache misses become your biggest enemy*

![Blog image](images/tiny_rust.png)

## The Cache Performance Reality Check

After the previous optimizations brought us from 10.422 μs to 2.562 μs, I was feeling pretty good. But then I bumped the grid size to 10,000×10,000 (~100MB) and reality hit hard. The cache performance became worse as I had expcted. It was because things were big enough to not fit in my L3 cache anymore.

## Measuring Cache and Branch Metrics


| Snakes | Cache Hit % | Cache Hits | Cache Misses | Branch Pred % | IPC | Iterations |
|--------|-------------|------------|--------------|---------------|-----|------------|
| 100    | 53.36%      | 9,136      | 6,993        | 99.77%        | 2.85| 263        |
| 300    | 53.32%      | 9,350      | 7,274        | 99.90%        | 3.93| 223        |
| 500    | 54.02%      | 17,990     | 13,517       | 99.93%        | 4.35| 327        |
| 700    | 76.03%      | 127,939    | 33,894       | 99.73%        | 4.64| 1,615      |
| 900    | 71.62%      | 160,699    | 56,923       | 99.82%        | 4.65| 1,615      |
| 1000   | 69.95%      | 226,756    | 88,068       | 99.87%        | 4.63| 1,820      |

The pattern was clear: **as snakes dispersed across the grid, we have more frequent cache misses**. At 1000 snakes, we were only hitting cache ~70% of the time. That's a lot of expensive memory accesses.

## Cache Thrashing!

The issue was in my object-oriented design philosophy. I had created clean, encapsulated methods for each class (Snake, Apple, etc.) that operated at a per-object level. While this made the code maintainable, it made global grid-level optimizations tricky.

Here's what was happening in each tick:

**Per Snake (1000 snakes per tick):**
1. **READ**: `grid.get_cell(&new_head)` - Check for apple consumption
2. **READ**: `grid.get_cell(&new_head)` - Check for collision  
3. **WRITE**: `grid.set_cell(*tail, Cell::Empty)` - Clear old tail
4. **WRITE**: `grid.set_cell(*head, Cell::Snake)` - Set new head

**Per Apple:**
1. **WRITE**: `grid.set_cell(new_apple_pos, Cell::Apple)` - Spawn new apple

With 1000 snakes, that's 4000+ random grid accesses per tick across a 10k×10k grid. We were essentially cache thrashing—jumping around randomly in a 100MB grid with no spatial locality.

## The Spatial Batching Solution

I needed to transform random access patterns into spatially-ordered operations. The key insight: **collect all movement records, sort them by position, then process in cache-friendly order**.

### The New Algorithm

**Phase 1: Collect Records (NO Grid Reads)**
```
FOR each alive snake:
    calculate new_head_position
    create MovementRecord(snake_id, new_head_position, empty_cell)
    add to records list
```

**Phase 2: Sort by Spatial Locality**
```
SORT records by (y_coordinate, x_coordinate)
// This groups nearby operations for better cache utilization
```

**Phase 3-5: Combined Loop (Read, Process, Write Immediately)**
```
FOR each record in sorted order:
    READ cell_at_new_head from grid
    DEAL with Snake Collision
    DEAL with apple eating
    
    HANDLE Snake Race conditions within tick()
    
    WRITE Snake to new_head position
    IF not growing:
        WRITE Empty to old tail position
    UPDATE snake body
```


### 1. Partitioning Instead of Full Sorting

Full sorting was expensive. Instead, I used **spatial partitioning** with 2^8 buckets:

```
CREATE 256 buckets (2^8)
FOR each movement record:
    calculate bucket_index = (y_coord >> 8) * 256 + (x_coord >> 8)
    add record to buckets[bucket_index]
```

This gave us most of the cache benefits with much less overhead.

### 2. Batched Tail Writes

The tail clearing writes were still causing cache misses. I collected these writes into buckets and processed them at the end:

```
DURING movement processing:
    IF snake not growing:
        add tail_position to tail_clears records

AT END of tick:
    FOR each tail_position in tail_clears records:
        WRITE Empty to tail_position
```

## Performance Results

**Before (Random Access):**
- 1000 snakes: 69.95% cache hit rate

**After (Spatial Batching):**
- 1000 snakes: 78.42% cache hit rate

**Cache hit rate improved from ~70% to ~78%** - a solid improvement, though not as dramatic as I'd hoped.

## TinyDeque: The Stack-First Approach

After optimizing the grid access patterns, I turned my attention to snake body storage. Most snakes in the game are small (3-4 segments), so I suspected that heap allocation for every snake body was wasteful.

### The VecDeque Problem

The standard `VecDeque` allocates each snake body on the heap, which means:
- **1000 snakes = 1000 heap allocations**
- **Poor cache locality** - snake bodies scattered across memory
- **Allocation overhead** for small collections

### My Custom Deque Attempt

I initially tried implementing a custom deque using `SmallVec` as the backing store:

```rust
pub struct Snake {
    pub body: SmallVec<[Point; 16]>,  // Stack-allocated for small snakes
    pub front_idx: usize,             // Circular buffer head
    pub end_idx: usize,               // Circular buffer tail
    // ...
}
```

**The result?** I realised it was going to be a bigger rabbit hole that I had imagined with all sorts of performance and edge case concerns. I was just about to spin off this new project and then ...

### Enter TinyDeque

I discovered the `tinydeque` crate - exactly what I needed!

```rust
pub struct Snake {
    pub body: TinyDeque<[Point; 16]>,  // Stack-first, heap spill
    // ...
}
```

**TinyDeque's magic:**
- **Starts on the stack** - small snakes use `ArrayDeque` (stack-allocated)
- **Automatic heap spill** - when the stack buffer fills, seamlessly transitions to `VecDeque`
- **Same API as VecDeque** - drop-in replacement with no complexity
- **Best of both worlds** - fast stack operations for small snakes, heap flexibility for large ones


## Final Results: The Performance Journey

### The Numbers

For the 10_000 * 10_000 grid:

| Optimization | Performance |
|-------------|-------------|
| **Baseline** | ~18 μs |
| **Spatial Batching + TinyDeque** | ~8.6 μs |

**Total improvement: 52% faster** - from ~18 μs down to ~8.6 μs per tick.

### What Actually Mattered

The performance journey taught me some valuable lessons about optimization:

1. **Cache locality trumps algorithmic complexity** - The spatial batching approach was more complex than the simple per-snake loop, but the cache benefits far outweighed the overhead.

2. **Measure, don't guess** - There were quite a few things I've tried, that seemed really good in theory, but never worked in practice.

3. **Premature optimization is still the root of all evil** - ;)


But for now, I'm happy with this performance. I am parking this project as I've found other projects to bootstrap along the way!
