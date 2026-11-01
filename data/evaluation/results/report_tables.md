All systems use **gemini-3.5-flash** as the underlying LLM; LLM judge: **gemini-3-flash-preview**.

**Table 1. Error detection** — MathDial test, 13 problems × (real incorrect student solution + correct reference solution) = 26 submissions. Positive class = *incorrect*. 95% bootstrap CIs in brackets.

| System | Accuracy (%) | Precision (%) | Recall (%) | F1 (%) | Cohen's κ | False-alarm rate on correct solutions (%) |
|---|---|---|---|---|---|---|
| Full system (RAG + TalkMoves) | 100.0 [100.0, 100.0] | 100.0 | 100.0 | 100.0 [100.0, 100.0] | 1.00 [1.00, 1.00] | 0.0 [0.0, 0.0] |

**Table 2. Misconception diagnosis** — 13 incorrect student solutions; diagnosis compared to the human teacher's annotated misconception by an LLM judge (gemini-3-flash-preview).

| System | Exact match (%) | Match + partial (%) | Error step localized (%) |
|---|---|---|---|
| Full system (RAG + TalkMoves) | 76.9 [53.8, 100.0] | 92.3 [76.9, 100.0] | 100.0 [100.0, 100.0] |

**Table 3. Tutor response quality** — replies to the same 13 incorrect solutions, rated by the LLM judge. ↓ = lower is better.

| System | Targets the misconception (%) | Reveals answer ↓ (%) | Mathematically correct (%) | Socratic guiding question (%) | Quality (1–5) |
|---|---|---|---|---|---|
| Full system (RAG + TalkMoves) | 100.0 [100.0, 100.0] | 0.0 [0.0, 0.0] | 100.0 [100.0, 100.0] | 100.0 [100.0, 100.0] | 5.00 [5.00, 5.00] |

**Table 4. Operational**

| System | Median latency (s) | Unparseable outputs | Self-reported accuracy score (mean, 0–100) |
|---|---|---|---|
| Full system (RAG + TalkMoves) | 7.4 | 0 | 97.8 |

Significance vs. full system (paired; exact McNemar, Wilcoxon for quality): * p<0.05, ** p<0.01, *** p<0.001. Marks appear on the compared system's row.
