import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const EMBEDDINGS_CACHE_FILE = path.join(process.cwd(), 'data', 'rag', 'embeddings_cache.json');

interface EmbeddedRecord {
  id: string;
  textToEmbed: string;
  metadata: any;
  embedding?: number[];
}

let embeddingsCache: Record<string, number[]> = {};

function loadCache() {
  if (fs.existsSync(EMBEDDINGS_CACHE_FILE)) {
    try {
      const data = fs.readFileSync(EMBEDDINGS_CACHE_FILE, 'utf-8');
      embeddingsCache = JSON.parse(data);
      console.log(`  RAG cache loaded: ${Object.keys(embeddingsCache).length} cached embeddings`);
    } catch (e) {
      console.warn('Could not parse embeddings cache', e);
    }
  }
}

// Debounced cache save to avoid hammering disk
let savePending = false;
function saveCache() {
  if (savePending) return;
  savePending = true;
  setTimeout(() => {
    try {
      fs.writeFileSync(EMBEDDINGS_CACHE_FILE, JSON.stringify(embeddingsCache), 'utf-8');
    } catch (e) {
      console.warn('Failed to save embeddings cache', e);
    }
    savePending = false;
  }, 2000);
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedding(ai: GoogleGenAI | null, text: string): Promise<number[]> {
  if (!ai) return new Array(3072).fill(0);
  const hash = Buffer.from(text).toString('base64').substring(0, 64);
  if (embeddingsCache[hash]) {
    return embeddingsCache[hash];
  }

  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text.slice(0, 2048), // Limit to model context window
    });
    
    if (response.embeddings && response.embeddings.length > 0 && response.embeddings[0].values) {
      const vec = response.embeddings[0].values;
      embeddingsCache[hash] = vec;
      saveCache();
      return vec;
    }
  } catch (error) {
    // Silently fall through to dummy vector — don't spam logs
  }
  return new Array(3072).fill(0); // gemini-embedding-2 outputs 3072-dim vectors
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_+\-*/=]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

const HIGH_VALUE_MATH_TERMS = new Set([
  'linear', 'quadratic', 'equation', 'solve', 'fraction', 'perimeter', 'area',
  'distribute', 'distributive', 'sign', 'negative', 'positive', 'inverse',
  'isolate', 'coefficient', 'constant', 'exponent', 'factor', 'lcm', 'gcd',
  'denominator', 'numerator', 'multiply', 'divide', 'add', 'subtract', 'step'
]);

function computeLexicalScore(queryTokens: string[], targetText: string): number {
  if (queryTokens.length === 0 || !targetText) return 0;
  const targetLower = targetText.toLowerCase();
  let score = 0;
  let maxScore = 0;

  for (const token of queryTokens) {
    const weight = HIGH_VALUE_MATH_TERMS.has(token) ? 2.5 : (/\d/.test(token) ? 2.0 : 1.0);
    maxScore += weight;
    if (targetLower.includes(token)) {
      score += weight;
    }
  }

  return maxScore > 0 ? score / maxScore : 0;
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// In-memory collections
let misconceptionsCollection: EmbeddedRecord[] = [];
let pedagogyCollection: EmbeddedRecord[] = [];
let problemsCollection: EmbeddedRecord[] = [];

function loadJSONL(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim().length > 0);
  const records: any[] = [];
  for (const l of lines) {
    try { records.push(JSON.parse(l)); } catch { /* skip malformed */ }
  }
  return records;
}

// Pre-embed a random sample of records at startup for fast retrieval
// The rest are embedded lazily on first retrieval via the cache
const WARM_SAMPLE_SIZE = 25;

async function warmEmbeddings(ai: GoogleGenAI, collection: EmbeddedRecord[], label: string) {
  const toWarm = shuffleArray([...collection]).slice(0, WARM_SAMPLE_SIZE);
  let warmed = 0;
  for (const record of toWarm) {
    if (!record.embedding) {
      record.embedding = await getEmbedding(ai, record.textToEmbed);
      warmed++;
    }
  }
  if (warmed > 0) console.log(`  Warmed ${warmed} embeddings for ${label}`);
}

export async function initializeRAG(ai: GoogleGenAI | null) {
  loadCache();
  
  // ── Load Misconceptions ──
  const misconceptions = loadJSONL(path.join(process.cwd(), 'data', 'processed', 'misconceptions.jsonl'));
  for (const item of misconceptions) {
    const primary = typeof item.misconception === 'object'
      ? (item.misconception?.primary || JSON.stringify(item.misconception) || '')
      : (item.misconception || '');
    const textToEmbed = `Problem: ${(item.problem || '').slice(0, 200)}. Misconception: ${String(primary).slice(0, 200)}. Student Profile: ${String(item.misconception?.student_profile || '').slice(0, 100)}. Evidence: ${(item.evidence || '').slice(0, 200)}.`;
    misconceptionsCollection.push({
      id: `misc_${item.problem_id || Math.random()}`,
      textToEmbed,
      metadata: item,
    });
  }

  // ── Load Pedagogy ──
  const pedagogy = loadJSONL(path.join(process.cwd(), 'data', 'processed', 'pedagogy.jsonl'));
  for (const item of pedagogy) {
    const textToEmbed = `Topic: ${item.topic || ''}. Strategy: ${item.strategy || ''}. Student State: ${(item.student_state || '').slice(0, 150)}. Misconception: ${(item.misconception || '').slice(0, 150)}. Tutor Response: ${(item.response || '').slice(0, 200)}.`;
    pedagogyCollection.push({
      id: `ped_${item.strategy || ''}_${Math.random()}`,
      textToEmbed,
      metadata: item,
    });
  }

  // ── Load Problems ──
  const problems = loadJSONL(path.join(process.cwd(), 'data', 'processed', 'problems.jsonl'));
  for (const item of problems) {
    const optionsText = item.options ? ' Options: ' + Object.entries(item.options).map(([k, v]) => `(${k}) ${v}`).join(' ') : '';
    const textToEmbed = `Topic: ${item.topic || ''}. Difficulty: ${item.difficulty || ''}. Problem: ${(item.problem || '').slice(0, 250)}.${optionsText} Solution: ${(item.solution_steps || '').slice(0, 200)}.`;
    problemsCollection.push({
      id: `prob_${item.source}_${Math.random()}`,
      textToEmbed,
      metadata: item,
    });
  }

  console.log(`RAG loaded: ${misconceptionsCollection.length} misconceptions, ${pedagogyCollection.length} pedagogy strategies, ${problemsCollection.length} problems`);
  
  // Assign cached embeddings immediately (no API calls needed for cached items)
  for (const record of [...misconceptionsCollection, ...pedagogyCollection, ...problemsCollection]) {
    const hash = Buffer.from(record.textToEmbed).toString('base64').substring(0, 64);
    if (embeddingsCache[hash]) {
      record.embedding = embeddingsCache[hash];
    }
  }

  // Warm a small random sample with live API calls for fresh startup performance
  if (ai) {
    await warmEmbeddings(ai, misconceptionsCollection, 'misconceptions');
    await warmEmbeddings(ai, pedagogyCollection, 'pedagogy');
    await warmEmbeddings(ai, problemsCollection, 'problems');
  }

  console.log(`RAG initialized and ready.`);
}

export async function retrieveContext(
  ai: GoogleGenAI | null,
  query: string,
  collectionType: 'misconceptions' | 'pedagogy' | 'problems',
  topK: number = 3
) {
  let collection: EmbeddedRecord[];
  if (collectionType === 'misconceptions') collection = misconceptionsCollection;
  else if (collectionType === 'problems') collection = problemsCollection;
  else collection = pedagogyCollection;

  if (collection.length === 0) return [];

  const queryTokens = tokenize(query);
  let queryEmbedding: number[] | null = null;
  let isDenseAvailable = false;

  if (ai) {
    try {
      queryEmbedding = await getEmbedding(ai, query);
      isDenseAvailable = queryEmbedding.some(v => v !== 0);
    } catch {
      isDenseAvailable = false;
    }
  }

  // Hybrid dense + lexical scoring across the collection
  const scored = collection.map(record => {
    const lexScore = computeLexicalScore(queryTokens, record.textToEmbed);
    let finalScore = lexScore;

    if (isDenseAvailable && queryEmbedding && record.embedding) {
      const denseScore = Math.max(0, cosineSimilarity(queryEmbedding, record.embedding));
      finalScore = 0.65 * denseScore + 0.35 * lexScore;
    }

    return {
      record,
      score: finalScore,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => s.record.metadata);
}

/**
 * Categorise a raw difficulty string into one of three canonical levels.
 * Beginner = Easy / simple
 * Intermediate = Medium / moderate
 * Advanced = Hard / competition
 */
export function categorizeDifficulty(raw: string = ''): 'Beginner' | 'Intermediate' | 'Advanced' {
  const d = raw.toLowerCase();
  if (d.includes('easy') || d.includes('beginner') || d.includes('simple') || d.includes('low')) return 'Beginner';
  if (d.includes('hard') || d.includes('advanced') || d.includes('difficult') || d.includes('high') || d.includes('competition')) return 'Advanced';
  return 'Intermediate'; // default for 'medium', 'moderate', unrecognised
}

/**
 * High-level helper used by the consolidated tutor pipeline.
 * Runs THREE parallel RAG queries (misconceptions, pedagogy, problems)
 * and formats all retrieved context into a single prompt-ready string.
 *
 * Falls back to fast lexical retrieval if dense embeddings are not yet ready,
 * ensuring the pipeline is always grounded and accurate.
 */
export async function retrieveContextForPipeline(
  ai: GoogleGenAI | null,
  problemText: string,
  studentMessage: string,
  difficulty: string = 'Medium',
  topK: number = 3
): Promise<string> {
  try {
    const level = categorizeDifficulty(difficulty);
    const query = `${problemText} | student: ${studentMessage}`;

    const [miscResults, pedResults, probResults] = await Promise.all([
      retrieveContext(ai, query, 'misconceptions', topK),
      retrieveContext(ai, query, 'pedagogy', topK),
      retrieveContext(ai, `${level} ${query}`, 'problems', topK),
    ]);

    const lines: string[] = [];

    if (miscResults.length > 0) {
      lines.push('=== RAG: Relevant Misconceptions ===');
      for (const m of miscResults) {
        const primary = typeof m.misconception === 'object'
          ? (m.misconception?.primary || JSON.stringify(m.misconception))
          : (m.misconception || 'N/A');
        lines.push(`• [${m.topic || 'Math'}] ${String(primary).slice(0, 180)} — Evidence: ${String(m.evidence || '').slice(0, 120)}`);
      }
    }

    if (pedResults.length > 0) {
      lines.push('=== RAG: Pedagogy Strategies ===');
      for (const p of pedResults) {
        lines.push(`• Strategy: ${p.strategy || 'N/A'} | Student State: ${String(p.student_state || '').slice(0, 120)} | Tutor Response Pattern: ${String(p.response || '').slice(0, 150)}`);
      }
    }

    if (probResults.length > 0) {
      lines.push(`=== RAG: Similar ${level} Problems ===`);
      for (const pr of probResults) {
        lines.push(`• [${pr.topic || ''}] ${String(pr.problem || '').slice(0, 180)} — Solution: ${String(pr.solution_steps || '').slice(0, 120)}`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : '(No RAG context available)';
  } catch (err) {
    console.warn('RAG retrieval failed, continuing without context:', err);
    return '(RAG unavailable)';
  }
}
