All systems use **gemini-3.5-flash-lite** as the underlying LLM; LLM judge: **gemini-3.1-flash-lite**.

**Table 1. Error detection** — MathDial test, 29 problems × (real incorrect student solution + correct reference solution) = 58 submissions. Positive class = *incorrect*. 95% bootstrap CIs in brackets.

| System | Accuracy (%) | Precision (%) | Recall (%) | F1 (%) | Cohen's κ | False-alarm rate on correct solutions (%) |
|---|---|---|---|---|---|---|
| Improved system (v2) | 96.6 [91.4, 100.0] | 93.5 | 100.0 | 96.7 [92.1, 100.0] | 0.93 [0.83, 1.00] | 6.9 [0.0, 17.2] |
| Original system (v1) | 84.5 [75.9, 93.1]* | 76.3 | 100.0 | 86.6 [80.6, 93.5] | 0.69 [0.52, 0.86] | 31.0 [13.8, 48.3] |
| Generic tutor baseline | 94.8 [87.9, 100.0] | 90.6 | 100.0 | 95.1 [89.2, 100.0] | 0.90 [0.76, 1.00] | 10.3 [0.0, 24.1] |

**Table 2. Misconception diagnosis** — 29 incorrect student solutions; diagnosis compared to the human teacher's annotated misconception by an LLM judge (gemini-3.1-flash-lite).

| System | Exact match (%) | Match + partial (%) | Error step localized (%) |
|---|---|---|---|
| Improved system (v2) | 65.5 [48.3, 82.8] | 65.5 [48.3, 82.8] | 86.2 [72.4, 96.6] |
| Original system (v1) | 62.1 [44.8, 79.3] | 62.1 [44.8, 79.3] | 89.7 [79.3, 100.0] |
| Generic tutor baseline | 58.6 [41.4, 75.9] | 62.1 [44.8, 79.3] | 86.2 [72.4, 96.6] |

**Table 3. Tutor response quality** — replies to the same 29 incorrect solutions, rated by the LLM judge. ↓ = lower is better.

| System | Targets the misconception (%) | Reveals answer ↓ (%) | Mathematically correct (%) | Socratic guiding question (%) | Quality (1–5) |
|---|---|---|---|---|---|
| Improved system (v2) | 69.0 [51.7, 86.2] | 3.4 [0.0, 10.3] | 89.7 [75.9, 100.0] | 100.0 [100.0, 100.0] | 4.14 [3.66, 4.59] |
| Original system (v1) | 65.5 [48.3, 82.8] | 0.0 [0.0, 0.0] | 79.3 [62.1, 93.1] | 100.0 [100.0, 100.0] | 3.93 [3.45, 4.38] |
| Generic tutor baseline | 62.1 [44.8, 79.3] | 100.0 [100.0, 100.0]*** | 93.1 [82.8, 100.0] | 0.0 [0.0, 0.0]*** | 2.59 [2.38, 2.79]*** |

**Table 4. Operational**

| System | Median latency (s) | Failed items (malformed output, after retries) | Self-reported accuracy score (mean, 0–100) |
|---|---|---|---|
| Improved system (v2) | 6.5 | 0/60 | 80.6 |
| Original system (v1) | 7.0 | 1/60 | 76.6 |
| Generic tutor baseline | 3.8 | 0/60 | n/a |

Significance vs. full system (paired; exact McNemar, Wilcoxon for quality): * p<0.05, ** p<0.01, *** p<0.001. Marks appear on the compared system's row.
