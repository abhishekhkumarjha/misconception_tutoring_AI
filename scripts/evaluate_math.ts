/**
 * Offline evaluation of the math tutoring pipeline on the MathDial test split.
 *
 *   npx tsx scripts/evaluate_math.ts [--n 50] [--seed 42] [--systems full,baseline,norag] [--skip-judge | --judge-only]
 *                                    [--system-model gemini-2.5-flash] [--judge-model gemini-3.5-flash]
 *
 * --system-model swaps the LLM the pipeline calls (it hardcodes gemini-2.5-flash) without editing it.
 *
 * For each sampled problem the system sees two submissions:
 *   - the real (teacher-annotated) incorrect student solution  -> gold "incorrect"
 *   - the reference solution                                    -> gold "correct"
 *
 * Systems:
 *   full     — the production pipeline (RAG + TalkMove exemplars + consolidated Gemini call)
 *   norag    — same pipeline with RAG context removed (ablation)
 *   baseline — generic tutor: same LLM, asked only to check correctness and explain the error
 *
 * The RAG index is rebuilt in a temp dir with every MathDial test problem removed, because
 * scripts/process_datasets.cjs indexes MathDial train+test together (gold labels would leak).
 *
 * Results are appended to data/evaluation/results/*.jsonl so an interrupted run resumes
 * where it stopped. Run scripts/analyze_eval.py afterwards to build the report tables.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env') });


// ── CLI args ──
const argv = process.argv.slice(2);
function arg(name: string, fallback: string) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}
const N = parseInt(arg('n', '50'), 10);
const SEED = parseInt(arg('seed', '42'), 10);
const SYSTEMS = arg('systems', 'full,baseline,norag').split(',');
const SKIP_JUDGE = argv.includes('--skip-judge');
const JUDGE_ONLY = argv.includes('--judge-only'); // grade saved predictions without new system calls
const PIPELINE_MODEL = 'gemini-2.5-flash'; // what src/backend/conversationEngine.ts requests
const SYSTEM_MODEL = arg('system-model', PIPELINE_MODEL);
const JUDGE_MODEL = arg('judge-model', 'gemini-3.5-flash');
if (SYSTEM_MODEL === JUDGE_MODEL) console.warn(`WARNING: judge and system are the same model (${JUDGE_MODEL}); expect self-preference bias.`);
const OUT_DIR = path.join(ROOT, arg('out', 'data/evaluation/results'));
fs.mkdirSync(OUT_DIR, { recursive: true });
const RESULTS_FILE = path.join(OUT_DIR, 'predictions.jsonl');
const JUDGE_FILE = path.join(OUT_DIR, 'judgments.jsonl');

// ── Seeded RNG (sampling + the pipeline's Math.random exemplar shuffling) ──
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
Math.random = mulberry32(SEED + 1);

function readJSONL(file: string): any[] {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf-8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}
const normKey = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Test sample ──
const mathdialTest = readJSONL(path.join(ROOT, 'data/raw/mathdial/mathdial-main/data/test.jsonl'));
const testKeys = new Set(mathdialTest.map(r => normKey(r.question)));
const byQid = new Map<string, any>();
for (const r of mathdialTest) if (!byQid.has(String(r.qid))) byQid.set(String(r.qid), r);
const pool = [...byQid.values()];
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}
// --offset selects a disjoint slice of the same shuffled pool (e.g. a held-out set after tuning on the first N)
const OFFSET = parseInt(arg('offset', '0'), 10);
const sample = pool.slice(OFFSET, OFFSET + N);

const finalAnswer = (solution: string) => solution.trim().split('\n').pop()!.trim();

interface EvalItem {
  id: string;
  qid: string;
  variant: 'incorrect' | 'correct';
  problem: string;
  attempt: string;
  target: string;
  referenceSolution: string;
  goldMisconception: string | null;
}
const items: EvalItem[] = sample.flatMap(r => [
  {
    id: `${r.qid}:incorrect`, qid: String(r.qid), variant: 'incorrect' as const,
    problem: r.question, attempt: r.student_incorrect_solution, target: finalAnswer(r.ground_truth),
    referenceSolution: r.ground_truth, goldMisconception: r.teacher_described_confusion,
  },
  {
    id: `${r.qid}:correct`, qid: String(r.qid), variant: 'correct' as const,
    problem: r.question, attempt: r.ground_truth, target: finalAnswer(r.ground_truth),
    referenceSolution: r.ground_truth, goldMisconception: null,
  },
]);

// ── Leak-free RAG mirror: copy processed data minus every MathDial test problem ──
function buildRagMirror(): string {
  const mirror = path.join(os.tmpdir(), 'misconception-eval-rag');
  fs.mkdirSync(path.join(mirror, 'data', 'processed'), { recursive: true });
  fs.mkdirSync(path.join(mirror, 'data', 'rag'), { recursive: true });
  for (const name of ['misconceptions', 'pedagogy', 'problems']) {
    const src = path.join(ROOT, 'data', 'processed', `${name}.jsonl`);
    const lines = fs.readFileSync(src, 'utf-8').split('\n').filter(l => l.trim());
    const kept = lines.filter(l => !testKeys.has(normKey(JSON.parse(l).problem)));
    fs.writeFileSync(path.join(mirror, 'data', 'processed', `${name}.jsonl`), kept.join('\n'));
    console.log(`  RAG mirror: ${name} kept ${kept.length}/${lines.length} (removed ${lines.length - kept.length} test-set records)`);
  }
  fs.copyFileSync(path.join(ROOT, 'data/processed/conversation_bank.json'), path.join(mirror, 'data/processed/conversation_bank.json'));
  const cache = path.join(mirror, 'data/rag/embeddings_cache.json');
  if (!fs.existsSync(cache)) fs.copyFileSync(path.join(ROOT, 'data/rag/embeddings_cache.json'), cache);
  return mirror;
}

// ── Rate-limited, retrying client wrapper (free tier: ~5 RPM, 20 requests/day per model) ──
class QuotaExhausted extends Error {}
const lastCallAt: Record<string, number> = {};
const MIN_INTERVAL_MS: Record<string, number> = { generate: parseInt(arg('interval-ms', '12500'), 10), embed: 700 };
const callLog = { lastText: null as string | null, lastFailed: false, lastError: null as unknown, embedFailures: 0 };

async function withRetry<T>(kind: 'generate' | 'embed', model: string, fn: () => Promise<T>): Promise<T> {
  const key = `${kind}:${model}`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const wait = (lastCallAt[key] || 0) + MIN_INTERVAL_MS[kind] - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt[key] = Date.now();
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (/PerDay|per day/i.test(msg) && /quota/i.test(msg)) throw new QuotaExhausted(`${model}: daily quota exhausted`);
      const retryable = /429|503|500|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|high demand|fetch failed|ECONNRESET/i.test(msg);
      if (!retryable || attempt === 7) throw e;
      const hinted = msg.match(/retry in ([\d.]+)s/i);
      const backoff = hinted ? parseFloat(hinted[1]) * 1000 + 1000 : Math.min(60000, 4000 * 2 ** attempt);
      console.log(`    [${model}] ${msg.slice(0, 80).replace(/\s+/g, ' ')}… retrying in ${Math.round(backoff / 1000)}s`);
      await sleep(backoff);
    }
  }
  throw new Error('unreachable');
}

// Free-tier quotas are per project and per model, so with several keys we move on to the next
// key when one key's daily quota for a model is used up.
function wrapClient(ai: GoogleGenAI, extraKeys: string[] = []) {
  const gens = [ai, ...extraKeys.map(k => new GoogleGenAI({ apiKey: k }))].map(c => c.models.generateContent.bind(c.models));
  const keyIndex: Record<string, number> = {};
  const emb = ai.models.embedContent.bind(ai.models);
  (ai.models as any).generateContent = async (req: any) => {
    if (req.model === PIPELINE_MODEL) req = { ...req, model: SYSTEM_MODEL };
    callLog.lastText = null;
    callLog.lastFailed = false;
    callLog.lastError = null;
    try {
      let res;
      for (;;) {
        const i = keyIndex[req.model] ?? 0;
        try {
          res = await withRetry('generate', req.model, () => gens[i](req));
          break;
        } catch (e) {
          if (!(e instanceof QuotaExhausted) || i + 1 >= gens.length) throw e;
          keyIndex[req.model] = i + 1;
          console.log(`    [${req.model}] key ${i + 1}/${gens.length} out of daily quota, switching to key ${i + 2}`);
        }
      }
      callLog.lastText = res.text ?? null;
      return res;
    } catch (e) {
      callLog.lastFailed = true;
      callLog.lastError = e;
      throw e;
    }
  };
  // rag.ts swallows embedding errors and silently degrades to lexical retrieval, so count them.
  (ai.models as any).embedContent = async (req: any) => {
    try {
      return await withRetry('embed', req.model, () => emb(req));
    } catch (e) {
      callLog.embedFailures++;
      throw e;
    }
  };
  return ai;
}

// The pipeline swallows API errors and falls back to a canned local response; surface that
// instead of scoring it. QuotaExhausted is re-thrown so the run stops cleanly.
async function runPipelineCall<T>(fn: () => Promise<T>): Promise<T> {
  const result = await fn();
  if (callLog.lastError instanceof QuotaExhausted) throw callLog.lastError;
  if (callLog.lastFailed) throw new Error('Gemini call failed; pipeline returned local fallback');
  return result;
}

function parseJSON(text: string | null): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  }
}

const BASELINE_PROMPT = (item: EvalItem) => `You are a math tutor. A student has submitted a solution to the problem below.
Determine whether the student's solution is correct. If it is incorrect, briefly explain what is wrong.
Then write your reply to the student.

PROBLEM:
${item.problem}
Correct final answer: ${item.target}

STUDENT SOLUTION:
"${item.attempt}"

Return ONLY valid JSON:
{
  "correctness": "correct" | "incorrect",
  "error_description": string,
  "message": string
}`;

async function main() {
  // EVAL_GEMINI_API_KEY may hold several comma-separated keys; generation rotates through them.
  const keys = (process.env.EVAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  if (!keys.length) throw new Error('Set EVAL_GEMINI_API_KEY or GEMINI_API_KEY in .env');
  const [apiKey, ...extraKeys] = keys;

  console.log(`MathDial test: ${byQid.size} unique problems; sampled ${sample.length} (seed ${SEED}, offset ${OFFSET}) -> ${items.length} items`);
  console.log(`System model: ${SYSTEM_MODEL} | judge model: ${JUDGE_MODEL}`);
  const mirror = buildRagMirror();
  process.chdir(mirror); // rag.ts and conversationEngine.ts resolve data/ from cwd

  const rag = await import(pathToFileURL(path.join(ROOT, 'src/backend/rag.ts')).href);
  const engine = await import(pathToFileURL(path.join(ROOT, 'src/backend/conversationEngine.ts')).href);

  const ai = wrapClient(new GoogleGenAI({ apiKey }), extraKeys);
  console.log(`Using ${keys.length} API key(s)`);
  await rag.initializeRAG(ai);

  const existing = readJSONL(RESULTS_FILE).filter(r => !r.error);
  const otherModel = existing.find(r => (r.model ?? PIPELINE_MODEL) !== SYSTEM_MODEL);
  if (otherModel) throw new Error(`${RESULTS_FILE} holds results from ${otherModel.model ?? PIPELINE_MODEL}; use a different --out for ${SYSTEM_MODEL}`);
  const done = new Set(existing.map(r => `${r.system}|${r.id}`));
  const append = (file: string, obj: any) => fs.appendFileSync(file, JSON.stringify(obj) + '\n');

  try {
    // Item-major order: if the quota runs out, every finished item has results from all systems.
    for (const item of JUDGE_ONLY ? [] : items) {
      const k = items.indexOf(item) + 1;
      for (const system of SYSTEMS) {
        if (done.has(`${system}|${item.id}`)) continue;
        const t0 = Date.now();
        let raw: any;
        let ragContext: string | null = null;
        try {
          if (system === 'baseline') {
            await ai.models.generateContent({
              model: SYSTEM_MODEL,
              contents: BASELINE_PROMPT(item),
              config: { responseMimeType: 'application/json' },
            });
            raw = parseJSON(callLog.lastText);
          } else {
            // any 'full*' system (e.g. full_v1 kept for comparison) runs the RAG pipeline as currently on disk
            ragContext = system.startsWith('full')
              ? await rag.retrieveContextForPipeline(ai, item.problem, item.attempt, 'Medium', 3)
              : '(RAG not provided)';
            await runPipelineCall(() =>
              engine.runConsolidatedTutorPipeline(ai, item.problem, item.target, item.attempt, [], ragContext, 'Intermediate'),
            );
            raw = parseJSON(callLog.lastText);
          }
        } catch (e: any) {
          if (e instanceof QuotaExhausted) throw e;
          console.log(`  [${system}] ${item.id} FAILED: ${String(e?.message || e).slice(0, 120)}`);
          append(RESULTS_FILE, { system, id: item.id, qid: item.qid, variant: item.variant, error: String(e?.message || e) });
          continue;
        }
        const latencyMs = Date.now() - t0;

        const record = system === 'baseline'
          ? {
              predicted: raw?.correctness ?? null,
              diagnosis: raw?.error_description ?? '',
              message: raw?.message ?? '',
              guidingQuestion: '',
              selfScores: null,
            }
          : {
              predicted: raw?.diagnosis?.correctness ?? null,
              diagnosis: [raw?.diagnosis?.misconception, raw?.diagnosis?.error_type && `(error type: ${raw.diagnosis.error_type})`, raw?.diagnosis?.mistake_step && `Mistake step: ${raw.diagnosis.mistake_step}`, raw?.diagnosis?.evidence && `Evidence: ${raw.diagnosis.evidence}`].filter(Boolean).join(' '),
              message: [raw?.message, raw?.guidingQuestion].filter(Boolean).join('\n'),
              guidingQuestion: raw?.guidingQuestion ?? '',
              selfScores: raw?.evaluation ?? null,
            };

        append(RESULTS_FILE, {
          system, model: SYSTEM_MODEL, id: item.id, qid: item.qid, variant: item.variant,
          gold: item.variant, goldMisconception: item.goldMisconception,
          ...record, confidence: raw?.diagnosis?.confidence ?? null,
          talkMove: raw?.pedagogy?.talk_move ?? null, latencyMs, raw,
        });
        console.log(`  [${system} ${k}/${items.length}] ${item.id} gold=${item.variant} pred=${record.predicted} (${latencyMs} ms, embed failures so far: ${callLog.embedFailures})`);
      }
    }

    if (!SKIP_JUDGE) await judgeAll(ai);
  } catch (e) {
    if (e instanceof QuotaExhausted) {
      console.log(`\nSTOPPED: ${e.message}. Re-run the same command after the quota resets to resume.`);
      process.exit(2);
    }
    throw e;
  }
  console.log('\nDone. Now run: python scripts/analyze_eval.py');
}

// ── LLM-as-judge (different, newer model than the system under test) ──
const JUDGE_PROMPT = (item: EvalItem, pred: any) => `You are an expert mathematics teacher grading an AI tutor's reply to a student's incorrect solution.

PROBLEM:
${item.problem}

REFERENCE SOLUTION:
${item.referenceSolution}

STUDENT'S INCORRECT SOLUTION:
${item.attempt}

GOLD MISCONCEPTION (written by a human teacher):
${item.goldMisconception}

AI TUTOR'S DIAGNOSIS OF THE ERROR:
${pred.diagnosis || '(none given)'}

AI TUTOR'S REPLY TO THE STUDENT:
${pred.message || '(empty)'}

Answer each question strictly:
1. misconception_match: Does the tutor's DIAGNOSIS identify the same underlying error as the gold misconception?
   "match" = same core error (wording may differ); "partial" = related or overlapping but incomplete/less specific;
   "no_match" = different error, generic, or no error identified.
2. error_localized: Does the diagnosis point to the step of the student's solution where the error actually occurs? (true/false)
3. reveals_answer: Does the REPLY state the correct final answer or hand the student the corrected step outright, instead of letting them work it out? (true/false)
4. targets_misconception: Is the REPLY specifically aimed at the student's actual error (per the gold misconception), rather than generic feedback? (true/false)
5. mathematically_correct: Is everything the REPLY says mathematically correct? (true/false)
6. socratic: Does the REPLY end by asking the student a guiding question that requires them to reason? (true/false)
7. quality: Overall pedagogical quality of the REPLY for this student, 1 (harmful/useless) to 5 (what an expert tutor would say).

Return ONLY JSON:
{"misconception_match": "match"|"partial"|"no_match", "error_localized": bool, "reveals_answer": bool,
 "targets_misconception": bool, "mathematically_correct": bool, "socratic": bool, "quality": 1-5, "rationale": string}`;

async function judgeAll(ai: GoogleGenAI) {
  const preds = readJSONL(RESULTS_FILE).filter(r => r.variant === 'incorrect' && !r.error);
  const judged = new Set(readJSONL(JUDGE_FILE).map(r => `${r.system}|${r.id}`));
  const itemById = new Map(items.map(i => [i.id, i]));
  const todo = preds.filter(p => itemById.has(p.id) && !judged.has(`${p.system}|${p.id}`));
  console.log(`\nJudging ${todo.length} tutor replies with ${JUDGE_MODEL}…`);
  let k = 0;
  for (const pred of todo) {
    k++;
    try {
      await ai.models.generateContent({
        model: JUDGE_MODEL,
        contents: JUDGE_PROMPT(itemById.get(pred.id)!, pred),
        config: { responseMimeType: 'application/json', temperature: 0 },
      });
      const j = parseJSON(callLog.lastText);
      fs.appendFileSync(JUDGE_FILE, JSON.stringify({ system: pred.system, id: pred.id, judge: JUDGE_MODEL, ...j }) + '\n');
      console.log(`  [judge ${k}/${todo.length}] ${pred.system} ${pred.id} -> ${j?.misconception_match} q=${j?.quality}`);
    } catch (e: any) {
      if (e instanceof QuotaExhausted) throw e;
      console.log(`  [judge] ${pred.system} ${pred.id} FAILED: ${String(e?.message || e).slice(0, 120)}`);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
