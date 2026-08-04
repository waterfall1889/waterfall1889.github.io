---
title: Notes on Efficient Attention Mechanisms
category: tech
tags: [Transformer, Attention, Efficiency]
date: 2025-03-15
---

Personal notes on approaches for reducing the quadratic cost of self-attention.

## Why It Matters

Standard self-attention costs `O(n^2)` in sequence length `n`, which becomes the
dominant bottleneck for long-context models.

## Approaches

1. **Sparse attention** — restrict each token to attend to a fixed pattern of
   neighbors (local window, strided, or learned sparsity).
2. **Linear attention** — approximate the softmax kernel so attention can be
   computed as a linear operation, e.g. via random features or kernel tricks.
3. **KV cache compression** — reduce memory pressure at inference time by
   quantizing or evicting stale key/value entries.

## Open Questions

- How much does sparsity pattern choice affect downstream task accuracy
  compared to full attention?
- Do these approximations compose well with quantization for edge deployment?
