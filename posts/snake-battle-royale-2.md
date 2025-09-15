---
title: Snake Battle Royale: High-Frequency Game Server optimization project 2/x
date: Sept 08, 2025
readTime: 10 min read
summary: When poor benchmarking, and cache misses bite back. 
---

# Snake Battle Royale: High-Frequency Game Server optimization project (Part 2)

*When poor benchmarking, and cache misses bite back*

![Blog image](images/cache_miss.png)

## But, first

After the initial 11x performance improvement from 51.71 μs to 4.56 μs, I was ready to dive deeper into the optimization rabbit hole. But first, I needed to make the problem harder to measure smaller improvements.

**The Setup**: I increased the grid size from 1000×1000 to 4000×4000. Still fits in L3 cache (barely), but makes the problem slightly more realistic and easier to measure micro-optimizations against.

## The Benchmarking Problem

My original benchmark was not the best, and had not given it much thought. Silly me, thinking benchmarking is not going to be my problem. I was using random game states and inputs, which meant every run was different. When I saw a 5% improvement, I couldn't tell if it was real optimization or just random variance. I needed deterministic, reproducible results.

### Building a Deterministic Benchmark

I designed a benchmark that guaranteed identical game state evolution every time:

- **Fixed starting positions**: Snakes placed in strategic locations for predictable collisions
- **Deterministic inputs**: Movement patterns that led to known outcomes (25% die, 25% grow, 50% unchanged)  
- **Predictable game state**: Every tick produced identical results

This eliminated the random noise and let me focus on measuring actual performance improvements.

## The CPU Frequency Chaos

But then my benchmark results were still all over the place. One run would show 40 μs, the next 57 μs, then back to 41 μs. This wasn't the deterministic performance I was looking for.

And then, in the quiet of my room, I heard my CPU fan go *brrr* because of another background process. That's when I realized the issue wasn't my benchmark—it was my environment.

### Root Causes: Two Environmental Variables

Two environmental variables were wreaking havoc on my measurements:

1. **CPU Frequency Chaos**: My CPU was switching between:
   - **Powersave mode**: 800 MHz, energy-efficient but slow
   - **Performance mode**: Variable frequency scaling based on load
   - **Thermal throttling**: Reducing frequency when things got hot

2. **Cache Variance**: CPU caching was not consistent across runs.

Even with core pinning, the frequency was jumping around like a snake on caffeine, and caches were warming up between runs.

### The Solution: Environment Lockdown

I needed to eliminate both variables entirely. The approach was simple but effective:

1. **Lock CPU governor** to "performance" mode
2. **Set min/max frequency** to the same value (4.0 GHz)
3. **Pin benchmark** to a specific CPU core (core 0)
4. **Use warm-up runs** for consistent cache state
5. **Restore original settings** after benchmark

I hacked together a CPU control script:

```bash
#!/bin/bash
# Store original settings
ORIGINAL_GOVERNOR=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor)
ORIGINAL_MIN_FREQ=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq)
ORIGINAL_MAX_FREQ=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq)

# Lock to performance mode at 4.0 GHz
echo performance | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
echo 4000000 | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq
echo 4000000 | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq

# Run benchmark with core pinning
sudo -u $ACTUAL_USER taskset -c 0 /home/boopop/.cargo/bin/cargo bench --bench game_bench hot_path/100_snakes

# Restore original settings
echo $ORIGINAL_GOVERNOR | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
echo $ORIGINAL_MIN_FREQ | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq
echo $ORIGINAL_MAX_FREQ | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq
```

**Final Approach**: Lock CPU to 4.0 GHz, pin to core 0, run benchmark twice (measure the second). This gives me consistent performance that also matches real-world conditions—or at least that's what I tell myself. So I moved on!

## The Inlining Disappointment

Now that we added a bunch of wrappers in the previous post, function entry and exits could be significant. Inlining them should help, right?

Turns out they weren't really helping that much.

**Hypothesis**: Something else, maybe cache misses, are taking up a larger chunk of time as we increase the number of snakes.

I ran some perf analysis, and my hypothesis was correct. But I'll get to the actual cache analysis in a minute. I'd been meaning to replace the HashMap with a simple static vector anyway to see the performance difference. That should help with cache performance too—HashMaps are notoriously harder to optimize for cache locality.

## The HashMap to Vector Migration

A vector is more straightforward for most cases except deletion of snakes. I just decided to keep the dead snakes in the vector all the time. There's a tradeoff because we'll be iterating over dead snakes, but the cache benefits should outweigh this cost, given new snakes are not spawned.

The cache performance across the tick() loop was now good, but still had room for improvement:

| Snakes | Cache Hit % | Cache Hits | Cache Misses | Branch Pred % | IPC | Iterations |
|--------|-------------|------------|--------------|---------------|-----|------------|
| 100    | 89.78%      | 145,534    | 15,584       | 99.69%        | 1.63| 1,311      |
| 300    | 90.10%      | 127,060    | 13,075       | 99.61%        | 2.01| 1,311      |
| 500    | 91.97%      | 134,445    | 10,988       | 99.58%        | 2.40| 1,311      |
| 700    | 90.42%      | 1,296,257  | 81,137       | 99.51%        | 2.65| 11,740     |
| 900    | **77.93%**  | 181,470    | 48,999       | 99.77%        | 2.52| 1,718      |
| 1000   | **78.39%**  | 194,042    | 50,558       | 99.85%        | 2.63| 1,820      |

Notice how cache hit percentage drops significantly at 900+ snakes.

## Cache Padding: False sharing?

I made the snake cache-padded as well:

```rust
pub struct GridAwareSnake {
    snake: CachePadded<Snake>,
}
```

That really seemed to help:

| Snakes | Cache Hit % | Cache Hits | Cache Misses | Branch Pred % | IPC | Iterations |
|--------|-------------|------------|--------------|---------------|-----|------------|
| 900    | **94.10%**  | 1,550,929  | 75,275       | 99.78%        | 2.61| 14,195     |
| 1000   | **92.91%**  | 1,561,478  | 97,616       | 99.45%        | 2.62| 14,195     |

Cache hit percentage jumped from ~78% to ~94%! The cache padding prevented false sharing between snake objects, dramatically improving cache performance.

## Performance Results

These two optimizations (HashMap → vector + cache padding) helped a lot:

**10.422 → 2.562 μs**
**~4x additional performance improvement**

## What's Next

Okay, now it's time to bump the grid size up because making the entire grid fit in cache felt too easy.

So I bumped it to 10,000 × 10,000. Now we're talking about a grid that definitely doesn't fit in cache, and we'll need to get creative with memory access patterns.

Optimizations in the next blog!
