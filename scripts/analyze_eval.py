"""
Build report tables from scripts/evaluate_math.ts output.

    python scripts/analyze_eval.py [--dir data/evaluation/results]

Writes report_tables.md, report_tables.tex and metrics.json into the results directory.
CIs are 95% percentile bootstrap (2000 resamples, resampling problems so the paired
correct/incorrect items of one problem stay together). Paired tests vs. the full system:
exact McNemar for binary metrics, Wilcoxon signed-rank for the 1-5 quality score.
"""
import argparse
import json
import random
from pathlib import Path

from scipy.stats import binomtest, wilcoxon

SYSTEM_NAMES = {
    "full": "Full system (RAG + TalkMoves)",
    "norag": "w/o RAG (ablation)",
    "baseline": "Generic tutor baseline",
}
ORDER = ["full", "norag", "baseline"]


def load_jsonl(path):
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def latest_ok(rows):
    """Last successful record per (system, id); failed attempts are kept only for counting."""
    out = {}
    for r in rows:
        if not r.get("error"):
            out[(r["system"], r["id"])] = r
    return out


def pred_incorrect(p):
    # "partial" means the tutor flagged an error; "inquiry" means it did not.
    return p in ("incorrect", "partial")


def detection_metrics(recs):
    tp = sum(1 for r in recs if r["gold"] == "incorrect" and pred_incorrect(r["predicted"]))
    fn = sum(1 for r in recs if r["gold"] == "incorrect" and not pred_incorrect(r["predicted"]))
    fp = sum(1 for r in recs if r["gold"] == "correct" and pred_incorrect(r["predicted"]))
    tn = sum(1 for r in recs if r["gold"] == "correct" and not pred_incorrect(r["predicted"]))
    n = tp + fn + fp + tn
    acc = (tp + tn) / n if n else float("nan")
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    # macro-F1 over both classes
    prec_c = tn / (tn + fn) if tn + fn else 0.0
    rec_c = tn / (tn + fp) if tn + fp else 0.0
    f1_c = 2 * prec_c * rec_c / (prec_c + rec_c) if prec_c + rec_c else 0.0
    pe = ((tp + fp) * (tp + fn) + (fn + tn) * (fp + tn)) / (n * n) if n else 0
    kappa = (acc - pe) / (1 - pe) if pe != 1 else 0.0
    far = fp / (fp + tn) if fp + tn else float("nan")
    return {"n": n, "accuracy": acc, "precision": prec, "recall": rec, "f1": f1,
            "macro_f1": (f1 + f1_c) / 2, "kappa": kappa, "false_alarm_rate": far,
            "tp": tp, "fn": fn, "fp": fp, "tn": tn}


def judged_metrics(js):
    n = len(js)
    if not n:
        return {"n": 0}
    m = lambda f: sum(1 for j in js if f(j)) / n
    q = [j["quality"] for j in js if isinstance(j.get("quality"), (int, float))]
    return {
        "n": n,
        "match": m(lambda j: j.get("misconception_match") == "match"),
        "match_or_partial": m(lambda j: j.get("misconception_match") in ("match", "partial")),
        "error_localized": m(lambda j: j.get("error_localized") is True),
        "targets_misconception": m(lambda j: j.get("targets_misconception") is True),
        "reveals_answer": m(lambda j: j.get("reveals_answer") is True),
        "mathematically_correct": m(lambda j: j.get("mathematically_correct") is True),
        "socratic": m(lambda j: j.get("socratic") is True),
        "quality": sum(q) / len(q) if q else float("nan"),
    }


def bootstrap(qids, fn, iters=2000, seed=0):
    rnd = random.Random(seed)
    vals = []
    for _ in range(iters):
        sample = [rnd.choice(qids) for _ in qids]
        v = fn(sample)
        if v == v:  # drop NaN
            vals.append(v)
    vals.sort()
    if not vals:
        return (float("nan"), float("nan"))
    return vals[int(0.025 * len(vals))], vals[int(0.975 * len(vals)) - 1]


def mcnemar(a, b):
    """Exact McNemar on paired booleans."""
    b01 = sum(1 for x, y in zip(a, b) if x and not y)
    b10 = sum(1 for x, y in zip(a, b) if y and not x)
    if b01 + b10 == 0:
        return 1.0
    return binomtest(b01, b01 + b10, 0.5).pvalue


def pct(x):
    return f"{100 * x:.1f}" if x == x else "–"


def fmt_ci(v, ci, scale=100, dp=1):
    if v != v:
        return "–"
    return f"{v * scale:.{dp}f} [{ci[0] * scale:.{dp}f}, {ci[1] * scale:.{dp}f}]"


def star(p):
    return "" if p is None else ("***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="data/evaluation/results")
    d = Path(ap.parse_args().dir)
    raw_preds = load_jsonl(d / "predictions.jsonl")
    preds = latest_ok(raw_preds)
    judg = {(j["system"], j["id"]): j for j in load_jsonl(d / "judgments.jsonl")}
    systems = [s for s in ORDER if any(k[0] == s for k in preds)]

    # Paired evaluation: only problems every system answered for both variants.
    qids_by_sys = {}
    for s in systems:
        ids = {k[1] for k in preds if k[0] == s}
        qids_by_sys[s] = {i.split(":")[0] for i in ids if f"{i.split(':')[0]}:correct" in ids and f"{i.split(':')[0]}:incorrect" in ids}
    common = sorted(set.intersection(*qids_by_sys.values()))
    judged_common = sorted(q for q in common if all((s, f"{q}:incorrect") in judg for s in systems))

    system_model = next((r.get("model") for r in preds.values() if r.get("model")), "gemini-2.5-flash")
    out = {"system_model": system_model, "judge_model": _judge_model(judg),
           "n_problems": len(common), "n_judged_problems": len(judged_common), "systems": {}}

    for s in systems:
        recs_for = lambda qs: [preds[(s, f"{q}:{v}")] for q in qs for v in ("incorrect", "correct")]
        js_for = lambda qs: [judg[(s, f"{q}:incorrect")] for q in qs]
        det = detection_metrics(recs_for(common))
        jm = judged_metrics(js_for(judged_common))
        ci = {}
        for k in ("accuracy", "f1", "kappa", "false_alarm_rate"):
            ci[k] = bootstrap(common, lambda qs, k=k: detection_metrics(recs_for(qs))[k])
        for k in ("match", "match_or_partial", "error_localized", "targets_misconception",
                  "reveals_answer", "mathematically_correct", "socratic", "quality"):
            if judged_common:
                ci[k] = bootstrap(judged_common, lambda qs, k=k: judged_metrics(js_for(qs))[k])
        lat = sorted(preds[(s, f"{q}:{v}")]["latencyMs"] for q in common for v in ("incorrect", "correct"))
        failures = sum(1 for r in raw_preds if r["system"] == s and r.get("error"))
        unparsed = sum(1 for r in recs_for(common) if r.get("predicted") is None)
        self_acc = [r["selfScores"]["accuracy_score"] for r in recs_for(common)
                    if isinstance(r.get("selfScores"), dict) and isinstance(r["selfScores"].get("accuracy_score"), (int, float))]
        out["systems"][s] = {
            "detection": det, "judged": jm, "ci": ci,
            "latency_median_ms": lat[len(lat) // 2] if lat else None,
            "api_failures_retried": failures, "unparsed_outputs": unparsed,
            "self_reported_accuracy_mean": sum(self_acc) / len(self_acc) if self_acc else None,
        }

    # Paired significance tests against the full system
    tests = {}
    if "full" in systems:
        for s in systems:
            if s == "full":
                continue
            t = {}
            ok = lambda sys, q, v: pred_incorrect(preds[(sys, f"{q}:{v}")]["predicted"]) == (v == "incorrect")
            pairs = [(q, v) for q in common for v in ("incorrect", "correct")]
            t["detection_correct"] = mcnemar([ok("full", q, v) for q, v in pairs], [ok(s, q, v) for q, v in pairs])
            for key, f in [("match", lambda j: j.get("misconception_match") == "match"),
                           ("match_or_partial", lambda j: j.get("misconception_match") in ("match", "partial")),
                           ("error_localized", lambda j: j.get("error_localized") is True),
                           ("targets_misconception", lambda j: j.get("targets_misconception") is True),
                           ("reveals_answer", lambda j: j.get("reveals_answer") is True),
                           ("mathematically_correct", lambda j: j.get("mathematically_correct") is True),
                           ("socratic", lambda j: j.get("socratic") is True)]:
                t[key] = mcnemar([f(judg[("full", f"{q}:incorrect")]) for q in judged_common],
                                 [f(judg[(s, f"{q}:incorrect")]) for q in judged_common]) if judged_common else None
            qa = [judg[("full", f"{q}:incorrect")].get("quality") for q in judged_common]
            qb = [judg[(s, f"{q}:incorrect")].get("quality") for q in judged_common]
            diffs = [a - b for a, b in zip(qa, qb) if isinstance(a, (int, float)) and isinstance(b, (int, float))]
            t["quality"] = wilcoxon(diffs).pvalue if any(diffs) else 1.0
            tests[s] = t
    out["paired_tests_vs_full"] = tests
    (d / "metrics.json").write_text(json.dumps(out, indent=2), encoding="utf-8")

    p = lambda s, k: None if s == "full" or s not in tests else tests[s].get(k)
    S = out["systems"]
    n_items = 2 * len(common)

    md = []
    md.append(f"All systems use **{system_model}** as the underlying LLM; LLM judge: **{_judge_model(judg)}**.\n")
    md.append(f"**Table 1. Error detection** — MathDial test, {len(common)} problems × (real incorrect student solution + correct reference solution) = {n_items} submissions. "
              "Positive class = *incorrect*. 95% bootstrap CIs in brackets.\n")
    md.append("| System | Accuracy (%) | Precision (%) | Recall (%) | F1 (%) | Cohen's κ | False-alarm rate on correct solutions (%) |")
    md.append("|---|---|---|---|---|---|---|")
    for s in systems:
        dm, ci = S[s]["detection"], S[s]["ci"]
        md.append(f"| {SYSTEM_NAMES[s]} | {fmt_ci(dm['accuracy'], ci['accuracy'])}{star(p(s, 'detection_correct'))} | {pct(dm['precision'])} | {pct(dm['recall'])} | "
                  f"{fmt_ci(dm['f1'], ci['f1'])} | {fmt_ci(dm['kappa'], ci['kappa'], scale=1, dp=2)} | {fmt_ci(dm['false_alarm_rate'], ci['false_alarm_rate'])} |")

    md.append(f"\n**Table 2. Misconception diagnosis** — {len(judged_common)} incorrect student solutions; diagnosis compared to the human teacher's annotated misconception by an LLM judge ({_judge_model(judg)}).\n")
    md.append("| System | Exact match (%) | Match + partial (%) | Error step localized (%) |")
    md.append("|---|---|---|---|")
    for s in systems:
        jm, ci = S[s]["judged"], S[s]["ci"]
        if not jm.get("n"):
            continue
        md.append(f"| {SYSTEM_NAMES[s]} | {fmt_ci(jm['match'], ci['match'])}{star(p(s, 'match'))} | {fmt_ci(jm['match_or_partial'], ci['match_or_partial'])}{star(p(s, 'match_or_partial'))} | "
                  f"{fmt_ci(jm['error_localized'], ci['error_localized'])}{star(p(s, 'error_localized'))} |")

    md.append(f"\n**Table 3. Tutor response quality** — replies to the same {len(judged_common)} incorrect solutions, rated by the LLM judge. ↓ = lower is better.\n")
    md.append("| System | Targets the misconception (%) | Reveals answer ↓ (%) | Mathematically correct (%) | Socratic guiding question (%) | Quality (1–5) |")
    md.append("|---|---|---|---|---|---|")
    for s in systems:
        jm, ci = S[s]["judged"], S[s]["ci"]
        if not jm.get("n"):
            continue
        md.append(f"| {SYSTEM_NAMES[s]} | {fmt_ci(jm['targets_misconception'], ci['targets_misconception'])}{star(p(s, 'targets_misconception'))} | "
                  f"{fmt_ci(jm['reveals_answer'], ci['reveals_answer'])}{star(p(s, 'reveals_answer'))} | "
                  f"{fmt_ci(jm['mathematically_correct'], ci['mathematically_correct'])}{star(p(s, 'mathematically_correct'))} | "
                  f"{fmt_ci(jm['socratic'], ci['socratic'])}{star(p(s, 'socratic'))} | "
                  f"{fmt_ci(jm['quality'], ci['quality'], scale=1, dp=2)}{star(p(s, 'quality'))} |")

    md.append("\n**Table 4. Operational**\n")
    md.append("| System | Median latency (s) | Unparseable outputs | Self-reported accuracy score (mean, 0–100) |")
    md.append("|---|---|---|---|")
    for s in systems:
        x = S[s]
        sr = f"{x['self_reported_accuracy_mean']:.1f}" if x["self_reported_accuracy_mean"] is not None else "n/a"
        md.append(f"| {SYSTEM_NAMES[s]} | {x['latency_median_ms'] / 1000:.1f} | {x['unparsed_outputs']} | {sr} |")

    md.append("\nSignificance vs. full system (paired; exact McNemar, Wilcoxon for quality): * p<0.05, ** p<0.01, *** p<0.001. Marks appear on the compared system's row.")
    (d / "report_tables.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    (d / "report_tables.tex").write_text(to_latex(systems, S, tests, len(common), len(judged_common), system_model, _judge_model(judg)), encoding="utf-8")
    print("\n".join(md))
    print(f"\nWrote {d / 'report_tables.md'}, {d / 'report_tables.tex'}, {d / 'metrics.json'}")


def _judge_model(judg):
    return next((j.get("judge") for j in judg.values()), "LLM judge")


def to_latex(systems, S, tests, n_prob, n_judged, system_model, judge_model):
    p = lambda s, k: None if s == "full" or s not in tests else tests[s].get(k)
    L = []
    L.append("% Requires \\usepackage{booktabs}")
    L.append("\\begin{table}[t]\\centering\\small")
    L.append(f"\\caption{{Error detection on MathDial test ({n_prob} problems, {2 * n_prob} submissions; positive class = incorrect). Underlying LLM: {system_model}.}}")
    L.append("\\begin{tabular}{lcccccc}\\toprule")
    L.append("System & Acc. & Prec. & Rec. & F1 & $\\kappa$ & FAR \\\\\\midrule")
    for s in systems:
        dm = S[s]["detection"]
        L.append(f"{SYSTEM_NAMES[s]} & {pct(dm['accuracy'])}{star(p(s, 'detection_correct'))} & {pct(dm['precision'])} & {pct(dm['recall'])} & {pct(dm['f1'])} & {dm['kappa']:.2f} & {pct(dm['false_alarm_rate'])} \\\\")
    L.append("\\bottomrule\\end{tabular}\\end{table}\n")
    L.append("\\begin{table}[t]\\centering\\small")
    L.append(f"\\caption{{Misconception diagnosis and tutor response quality on {n_judged} incorrect student solutions (judge: {judge_model}). RA = reveals answer (lower is better).}}")
    L.append("\\begin{tabular}{lcccccccc}\\toprule")
    L.append("System & Match & Match+Part. & Localized & Targets & RA$\\downarrow$ & Math OK & Socratic & Quality \\\\\\midrule")
    for s in systems:
        j = S[s]["judged"]
        if not j.get("n"):
            continue
        L.append(f"{SYSTEM_NAMES[s]} & {pct(j['match'])}{star(p(s, 'match'))} & {pct(j['match_or_partial'])}{star(p(s, 'match_or_partial'))} & {pct(j['error_localized'])}{star(p(s, 'error_localized'))} & "
                 f"{pct(j['targets_misconception'])}{star(p(s, 'targets_misconception'))} & {pct(j['reveals_answer'])}{star(p(s, 'reveals_answer'))} & {pct(j['mathematically_correct'])}{star(p(s, 'mathematically_correct'))} & "
                 f"{pct(j['socratic'])}{star(p(s, 'socratic'))} & {j['quality']:.2f}{star(p(s, 'quality'))} \\\\")
    L.append("\\bottomrule\\end{tabular}\\end{table}")
    return "\n".join(L).replace("κ", "$\\kappa$") + "\n"


if __name__ == "__main__":
    main()
