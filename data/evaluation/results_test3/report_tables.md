All systems use **gemini-3.1-flash-lite** as the underlying LLM; LLM judge: **claude-opus-5-5 (blinded)**.

**Table 1. Error detection** — MathDial test, 30 problems × (real incorrect student solution + correct reference solution) = 60 submissions. Positive class = *incorrect*. 95% bootstrap CIs in brackets.

| System | Accuracy (%) | Precision (%) | Recall (%) | F1 (%) | Cohen's κ | False-alarm rate on correct solutions (%) |
|---|---|---|---|---|---|---|
| Improved system (v3) | 98.3 [95.0, 100.0] | 100.0 | 96.7 | 98.3 [94.7, 100.0] | 0.97 [0.90, 1.00] | 0.0 [0.0, 0.0] |
| Previous system (v2) | 96.7 [91.7, 100.0] | 93.8 | 100.0 | 96.8 [92.3, 100.0] | 0.93 [0.83, 1.00] | 6.7 [0.0, 16.7] |

**Table 2. Misconception diagnosis** — 30 incorrect student solutions; diagnosis compared to the human teacher's annotated misconception by an LLM judge (claude-opus-5-5 (blinded)).

| System | Exact match (%) | Match + partial (%) | Error step localized (%) |
|---|---|---|---|
| Improved system (v3) | 86.7 [73.3, 96.7] | 100.0 [100.0, 100.0] | 96.7 [90.0, 100.0] |
| Previous system (v2) | 66.7 [50.0, 83.3] | 90.0 [80.0, 100.0] | 93.3 [83.3, 100.0] |

**Table 3. Tutor response quality** — replies to the same 30 incorrect solutions, rated by the LLM judge. ↓ = lower is better.

| System | Targets the misconception (%) | Reveals answer ↓ (%) | Mathematically correct (%) | Socratic guiding question (%) | Quality (1–5) |
|---|---|---|---|---|---|
| Improved system (v3) | 100.0 [100.0, 100.0] | 33.3 [16.7, 50.0] | 100.0 [100.0, 100.0] | 73.3 [56.7, 90.0] | 3.67 [3.47, 3.87] |
| Previous system (v2) | 83.3 [70.0, 96.7] | 33.3 [16.7, 50.0] | 76.7 [60.0, 90.0]* | 63.3 [46.7, 80.0] | 3.13 [2.73, 3.50]* |

**Table 4. Operational**

| System | Median latency (s) | Failed items (malformed output, after retries) | Self-reported accuracy score (mean, 0–100) |
|---|---|---|---|
| Improved system (v3) | 9.4 | 0/60 | 80.4 |
| Previous system (v2) | 7.4 | 0/60 | 77.8 |

Significance vs. full system (paired; exact McNemar, Wilcoxon for quality): * p<0.05, ** p<0.01, *** p<0.001. Marks appear on the compared system's row.
