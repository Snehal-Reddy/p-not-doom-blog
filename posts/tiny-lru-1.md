---
title: tiny-lru: Fast Small-then-Spill LRU cache 1/x
date: October 19, 2025
readTime: 6 min read
summary: Designing a hybrid LRU cache that dominates small workloads while scaling to larger ones
---

# Designing and Implementing v0.1.0 of tiny-lru

*A Fast Small-then-Spill LRU cache combining the raw speed of stack-based LRUs with the scalability of heap-backed ones*

![Blog image](images/tiny_lru.png)

## Background

LRU caches are fundamental data structures, but existing Rust implementations force a trade-off: optimize for small caches with stack storage, or optimize for large caches with heap storage.

The Rust ecosystem offers a few LRU implementations, but what was missing was a hybrid approach. The `tinyvec` crate successfully solved this for vectors—starting with inline array storage and automatically "spilling" to heap when needed. This pattern optimizes for the common case (small collections) while handling edge cases (large collections).

`tiny-lru` applies this proven pattern to LRU caches. For small caches, it provides zero allocations, linear search performance, and excellent cache locality. When capacity is exceeded, it transparently transitions to heap-backed storage with O(1) operations.

## Design Philosophy: Small-First, Scale-Second

The core insight behind `tiny-lru` is simple: **optimize for the common case first, then handle the edge cases**.

For very small working sets, entries are stored inline on the stack in a fixed-capacity array, giving fast, allocation-free lookups and updates with excellent cache locality. Once the inline capacity is exceeded, it transparently "spills" into a heap-backed LRU (hash map + linked list), ensuring O(1) operations at larger scales.

The design goal is zero compromise on micro-performance for small caches while still supporting larger workloads without falling off a performance cliff. In short: a `tinyvec`-style hybrid LRU optimized for both tiny hot paths (embedded, HFT, real-time) and unbounded dynamic growth when needed.

## The Two-Tier Architecture

### Pre-Spill: Stack-First Performance

When your cache is small (≤ N entries), everything happens on the stack:

```rust
struct TinyLru<K, V, const N: usize> {
    // Unified node storage; starts inline, spills to heap as capacity grows
    store: tinyvec::TinyVec<[Entry<K, V>; N]>,
    
    // Current number of live items
    size: u16,
    
    // LRU linkage heads (indices into `store`)
    head: u16, // LRU index
    tail: u16, // MRU index
    
    // Key → index map. Lazily allocated ONLY on first spill
    index: Option<hashbrown::HashMap<K, u16>>,
    
    capacity: u16,
}
```

**Key benefits of the pre-spill design:**
- **Zero allocations** - everything fits in the stack-allocated `TinyVec`
- **Linear search** - for small N, linear search is faster than hash lookups
- **Cache-friendly** - all data is contiguous in memory

### Post-Spill: Heap-Backed Scalability

When you exceed the inline capacity, the cache automatically "spills":

1. **All entries move to heap storage** via `TinyVec`'s automatic spill
2. **Hash map index is allocated** for O(1) lookups
3. **Linked list structure is maintained** for LRU ordering
4. **Same API, different backing** - transparent to the user

## Basic v0.1.0 API

The API is designed to be a drop-in replacement for standard LRU caches:

```rust
// Core operations
push(key, value)                    // Insert or update; promotes on hit
pop() -> Option<(K, V)>             // Remove and return the LRU entry
get(&mut self, key: &K) -> Option<&V>        // Lookup with promotion
get_mut(&mut self, key: &K) -> Option<&mut V> // Mutable lookup with promotion
peek(&self, key: &K) -> Option<&V>  // Lookup without promotion
remove(&mut self, key: &K) -> Option<(K, V)> // Remove by key

// Capacity management
set_capacity(&mut self, new_cap: u16) // Adjust total capacity
capacity() -> u16
len() -> u16
is_empty() -> bool

// Spill management
is_spilled() -> bool    // Check if using heap storage
can_unspill() -> bool   // Check if unspill is possible
unspill() -> bool       // Move back to inline storage
```

## The AoS vs SoA Experiment (And Why I Abandoned It)

Initially, I considered a Struct of Arrays (SoA) approach to enable SIMD optimizations:

```rust
struct TinyLruSoA<K, V, const N: usize> {
    hashes: TinyVec<[u64; N]>,        // Pre-computed hashes for SIMD
    keys: TinyVec<[K; N]>,            // Actual keys
    values: TinyVec<[V; N]>,          // Values
    next: TinyVec<[u16; N]>,          // DLL next pointers
    prev: TinyVec<[u16; N]>,          // DLL prev pointers
    // ...
}
```

**The theory**: Separate arrays would enable SIMD-optimized hash comparisons and better cache utilization.

**The reality**: The SoA approach was actually slower in practice. The overhead of maintaining separate arrays and the complexity of SIMD operations outweighed the theoretical benefits. Sometimes the simple solution really is the best solution.

## Performance Results:

I benchmarked `tiny-lru` against the major Rust LRU implementations across different cache sizes. 

### Pre-Spill Performance (Small Cache Sizes)

Performance comparison showing relative speed (higher numbers = slower). `tiny-lru` is the baseline (1.00).


**Push Operations:**
| Implementation | 2 | 4 | 8 | 16 | 32 |
|------------|------|------|------|------|------|
| tiny-lru 👍 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| const-lru | 2.00 | 2.39 | 2.68 | 2.90 | 2.65 |
| lru-rs | 6.96 | 7.22 | 6.02 | 5.49 | 3.67 |
| schnellru | 2.36 | 6.42 | 7.84 | 7.66 | 5.61 |

**Pop Operations:**
| Implementation | 2 | 4 | 8 | 16 | 32 |
|------------|------|------|------|------|------|
| tiny-lru 👍 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| const-lru | 2.58 | 3.76 | 3.53 | 3.84 | 5.17 |
| lru-rs | 14.05 | 9.33 | 7.10 | 4.13 | 3.58 |
| schnellru | 1.15 | 1.31 | 1.33 | 1.11 | 0.83 |

**Peek Operations:**
| Implementation | 2 | 4 | 8 | 16 | 32 |
|------------|------|------|------|------|------|
| tiny-lru 👍 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| const-lru | 1.90 | 2.37 | 2.03 | 1.56 | 1.16 |
| lru-rs | 3.58 | 4.29 | 3.47 | 2.25 | 1.12 |
| schnellru | 1.16 | 1.60 | 1.60 | 1.20 | 0.77 |

**Get Operations:**
| Implementation | 2 | 4 | 8 | 16 | 32 |
|------------|------|------|------|------|------|
| tiny-lru 👍 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| const-lru | 2.00 | 3.02 | 2.80 | 1.77 | 1.30 |
| lru-rs | 3.11 | 3.08 | 2.56 | 1.46 | 0.77 |
| schnellru | 0.98 | 1.14 | 1.21 | 0.90 | 0.60 |


**The results are great-ish**: `tiny-lru` is consistently faster across small sizes. Although as N increases traditional lru's start catching up.

### Post-Spill Performance (Large Cache Sizes)

For larger caches, `tiny-lru` maintains competitive performance:


**Peek Operations:**
| Implementation | 100 | 200 | 500 | 1000 | 2000 | 5000 | 10000 |
|------------|------|------|------|------|------|------|------|
| lru-rs | 2.11 | 2.26 | 2.22 | 2.18 | 2.15 | 1.71 | 1.46 |
| schnellru | 2.59 | 2.43 | 1.54 | 1.60 | 1.62 | 1.71 | 1.70 |
| tiny-lru 👍 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

**Get Operations:**
| Implementation | 100 | 200 | 500 | 1000 | 2000 | 5000 | 10000 |
|------------|------|------|------|------|------|------|------|
| lru-rs | 1.64 | 1.60 | 1.56 | 1.27 | 1.16 | 1.07 | 0.89 |
| schnellru | 1.49 | 1.28 | 0.86 | 0.83 | 0.82 | 0.82 | 0.83 |
| tiny-lru 👍 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

**Put Operations:**
| Implementation | 100 | 200 | 500 | 1000 | 2000 | 5000 | 10000 |
|------------|------|------|------|------|------|------|------|
| lru-rs | 8.17 | 1.73 | 1.54 | 1.51 | 1.34 | 1.34 | 1.36 |
| schnellru | 1.09 | 1.33 | 1.66 | 1.74 | 1.64 | 1.53 | 1.56 |
| tiny-lru 👍 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |


## Why Keeping Things Simple Paid Off

The performance results validate the "simple is better" philosophy:

1. **Linear search beats hash tables** for small N (typically N ≤ 32)
2. **Stack allocation beats heap allocation** for predictable workloads
3. **Contiguous memory beats pointer chasing** for cache performance
4. **Two-tier design beats one-size-fits-all** for mixed workloads


## Future Work

While v0.1.0 is good enough for now, there's always room for improvement:

- Support larger sizes
- Optimise pop() and find_key_index() further()
- Have optinal strogner guards against spill.
