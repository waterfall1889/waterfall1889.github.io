---
title: Introduction to Computer Systems I
category: course
tags: [CSAPP, Systems, C]
date: 2024-09-01
---

Course notes covering the first half of CSAPP: data representation, machine-level
programs, and the memory hierarchy.

## Data Representation

- Two's complement encoding for signed integers.
- IEEE 754 floating point: sign, exponent, mantissa.
- Common bit-manipulation pitfalls: overflow, implicit casts between signed/unsigned.

## Machine-Level Programs

- x86-64 calling convention: argument registers, stack frame layout, callee-saved registers.
- Control flow translates to conditional jumps driven by condition-code flags.

## Memory Hierarchy

| Level      | Typical Latency | Typical Size |
| ---------- | ---------------- | ------------ |
| L1 cache   | ~1 ns             | 32-64 KB     |
| L2 cache   | ~4 ns             | 256 KB-1 MB  |
| DRAM       | ~100 ns           | GBs          |
| SSD        | ~100 us           | TBs          |

Locality (temporal and spatial) is the key idea that makes caching effective.
