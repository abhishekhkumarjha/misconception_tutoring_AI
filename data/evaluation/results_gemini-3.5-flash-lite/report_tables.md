All systems use **gemini-3.5-flash-lite** as the underlying LLM; LLM judge: **gemini-3.1-flash-lite**.

**Table 1. Error detection** — MathDial test, 47 problems × (real incorrect student solution + correct reference solution) = 94 submissions. Positive class = *incorrect*. 95% bootstrap CIs in brackets.

| System | Accuracy (%) | Precision (%) | Recall (%) | F1 (%) | Cohen's κ | False-alarm rate on correct solutions (%) |
|---|---|---|---|---|---|---|
| Full system (RAG + TalkMoves) | 90.4 [85.1, 95.7] | 83.9 | 100.0 | 91.3 [87.0, 95.9] | 0.81 [0.70, 0.91] | 19.1 [8.5, 29.8] |
| w/o RAG (ablation) | 90.4 [85.1, 95.7] | 83.9 | 100.0 | 91.3 [87.0, 95.9] | 0.81 [0.70, 0.91] | 19.1 [8.5, 29.8] |
| Generic tutor baseline | 96.8 [92.6, 100.0] | 95.8 | 97.9 | 96.8 [92.8, 100.0] | 0.94 [0.85, 1.00] | 4.3 [0.0, 10.6] |

**Table 2. Misconception diagnosis** — 47 incorrect student solutions; diagnosis compared to the human teacher's annotated misconception by an LLM judge (gemini-3.1-flash-lite).

| System | Exact match (%) | Match + partial (%) | Error step localized (%) |
|---|---|---|---|
| Full system (RAG + TalkMoves) | 66.0 [53.2, 78.7] | 68.1 [55.3, 80.9] | 87.2 [76.6, 95.7] |
| w/o RAG (ablation) | 70.2 [57.4, 83.0] | 72.3 [59.6, 85.1] | 87.2 [76.6, 95.7] |
| Generic tutor baseline | 61.7 [48.9, 76.6] | 63.8 [51.1, 76.6] | 87.2 [76.6, 95.7] |

**Table 3. Tutor response quality** — replies to the same 47 incorrect solutions, rated by the LLM judge. ↓ = lower is better.

| System | Targets the misconception (%) | Reveals answer ↓ (%) | Mathematically correct (%) | Socratic guiding question (%) | Quality (1–5) |
|---|---|---|---|---|---|
| Full system (RAG + TalkMoves) | 68.1 [55.3, 80.9] | 0.0 [0.0, 0.0] | 89.4 [78.7, 97.9] | 100.0 [100.0, 100.0] | 4.19 [3.85, 4.53] |
| w/o RAG (ablation) | 72.3 [59.6, 85.1] | 0.0 [0.0, 0.0] | 87.2 [76.6, 95.7] | 100.0 [100.0, 100.0] | 4.09 [3.72, 4.45] |
| Generic tutor baseline | 63.8 [51.1, 76.6] | 85.1 [74.5, 93.6]*** | 89.4 [80.9, 97.9] | 14.9 [6.4, 25.5]*** | 2.72 [2.47, 3.00]*** |

**Table 4. Operational**

| System | Median latency (s) | Failed items (malformed output, after retries) | Self-reported accuracy score (mean, 0–100) |
|---|---|---|---|
| Full system (RAG + TalkMoves) | 13.0 | 2/100 | 78.4 |
| w/o RAG (ablation) | 12.6 | 0/100 | 78.1 |
| Generic tutor baseline | 11.9 | 1/100 | n/a |

Significance vs. full system (paired; exact McNemar, Wilcoxon for quality): * p<0.05, ** p<0.01, *** p<0.001. Marks appear on the compared system's row.
