import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

import { detectError } from './src/backend/errorDetector.js';
import { planPedagogy } from './src/backend/pedagogicalPlanner.js';
import { generateTutorResponse } from './src/backend/tutor.js';
import { evaluateTutorResponse } from './src/backend/evaluator.js';
import { initializeRAG, retrieveContext, retrieveContextForPipeline, categorizeDifficulty } from './src/backend/rag.js';
import {
  runConsolidatedTutorPipeline,
  classifyStudentIntent,
  generateLocalPedagogicalResponse,
} from './src/backend/conversationEngine.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'misconception-tutoring-ai',
        },
      },
    });
  }
  return genAIClient;
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: `${process.env.GEMINI_MODEL || 'gemini-2.5-flash'} + RAG (55k records + 22k Dialogue Pairs + TalkMoves)`,
  });
});

import { runEnhancedPythonAnalysis, runPythonCodeSafely } from './src/backend/pythonTutorBridge.js';

app.get('/api/dataset-stats', (_req: Request, res: Response) => {
  res.json({
    platform: 'UniTutor AI — Adaptive Mathematics & Python Learning Assistant',
    totalRecords: 78403,
    mathematics: {
      totalRecords: 77835,
      misconceptions: 11814,
      pedagogyStrategies: 33877,
      problems: 9731,
      diagnosticQuestions: 988,
      dialogueTurns: 68719,
      activeDialoguePairs: 22413,
      sources: ['EEDI / Diagnostic Questions', 'MathDial', 'GSM8K', 'Hendrycks MATH'],
    },
    python: {
      taxonomyMisconceptions: 67,
      problemTemplates: 501,
      methodology: 'Enhanced Model (AST RAG Indexing + Mental Execution Tracing + Verification)',
      sources: ['MisconAI Standardized Python Taxonomy', 'CodeContests & Curated Problems'],
    },
    crossDomain: {
      enabled: true,
      features: ['Algebra in Python', 'Quadratic Roots', 'Factorials & Iteration', 'Prime Sieves'],
    },
  });
});

// POST /api/python/run - Safe student Python execution
app.post('/api/python/run', async (req: Request, res: Response) => {
  try {
    const { code, testInputs } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Missing code in request body.' });
      return;
    }
    const result = await runPythonCodeSafely(code, testInputs);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Execution error' });
  }
});

const MAX_ATTEMPT_CHARS = 8000;

// Code-like answers to cross-domain problems go to the Python pipeline; "x = 5" or "for the first step" stay math.
function looksLikePythonCode(text: string): boolean {
  return (
    /^\s*(def|class|while|if|elif|else|for|try|except|with)\b[^\n]*:\s*$/m.test(text) || // block header ending in ':'
    /^\s*(import\s+\w|from\s+[\w.]+\s+import\b)/m.test(text) ||
    /\bprint\s*\(/.test(text)
  );
}

// POST /api/chat - Unified Multi-Subject Socratic Tutoring Pipeline
app.post('/api/chat', async (req: Request, res: Response) => {
  const startTime = Date.now();
  // Validate before the try block so the error fallback below never sees malformed input.
  const body = req.body ?? {};
  const problem = body.problem;
  const studentAttempt = typeof body.studentAttempt === 'string' ? body.studentAttempt.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject : undefined;
  const history = Array.isArray(body.history)
    ? body.history.filter((m: any) => m && typeof m.text === 'string' && typeof m.sender === 'string')
    : [];
  const problemIsValid = (typeof problem === 'string' && problem.trim() !== '') || (problem && typeof problem === 'object');

  if (!problemIsValid || !studentAttempt) {
    res.status(400).json({ error: 'Request needs a problem (string or object) and a non-empty studentAttempt string.' });
    return;
  }
  if (studentAttempt.length > MAX_ATTEMPT_CHARS) {
    res.status(413).json({ error: `studentAttempt is longer than ${MAX_ATTEMPT_CHARS} characters.` });
    return;
  }

  try {
    const determinedSubject =
      subject ||
      (typeof problem === 'object' && problem.subjectType) ||
      (typeof problem === 'object' && problem.starterCode ? 'python' : 'math');

    const baseProblemText = typeof problem === 'string' ? problem : problem.problem || problem.title || '';
    const rawDifficulty = typeof problem === 'object' ? problem.difficulty || 'Medium' : 'Medium';
    const problemLevel = categorizeDifficulty(rawDifficulty);

    let result;

    // ── PYTHON & CROSS-DOMAIN PIPELINE (Enhanced MisconAI Model) ──
    if (determinedSubject === 'python' || (determinedSubject === 'cross_domain' && looksLikePythonCode(studentAttempt))) {
      const problemTitle = typeof problem === 'object' ? problem.title || baseProblemText : 'Python Problem';
      const expectedOutput = typeof problem === 'object' ? problem.expectedOutput || '' : '';

      result = await runEnhancedPythonAnalysis({
        problemTitle,
        problemDescription: baseProblemText,
        code: studentAttempt,
        level: problemLevel,
        expectedOutput,
      });
    } else {
      // ── MATHEMATICS PIPELINE (77k+ Records RAG + TalkMoves) ──
      const optionsText = problem?.options
        ? '\nOptions:\n' + Object.entries(problem.options).map(([k, v]) => `(${k}) ${v}`).join('\n')
        : '';
      const problemText = baseProblemText + optionsText;

      const targetSolution = typeof problem === 'object'
        ? (problem.targetSolution || (problem.correctOption ? `Choice ${problem.correctOption}` : ''))
        : '';

      const ai = getGeminiClient();

      if (ai) {
        // Retrieve RAG context in parallel with intent classification
        const ragContext = await retrieveContextForPipeline(ai, problemText, studentAttempt, rawDifficulty, 3);
        result = await runConsolidatedTutorPipeline(ai, problemText, targetSolution, studentAttempt, history, ragContext, problemLevel);
      } else {
        const intent = classifyStudentIntent(studentAttempt);
        const local = generateLocalPedagogicalResponse(problemText, studentAttempt, intent, history);
        result = { id: `resp-${Date.now()}`, ...local };
      }
    }

    const latencyMs = Date.now() - startTime;
    if ((result as any).evaluation) {
      (result as any).evaluation.latencyMs = latencyMs;
    }

    res.json(result);
  } catch (error) {
    console.error('Error handling /api/chat:', error);
    try {
      const problemText = typeof problem === 'string' ? problem : String(problem.problem || problem.title || '');
      const fallback = generateLocalPedagogicalResponse(problemText, studentAttempt, classifyStudentIntent(studentAttempt), history);
      res.json({ id: `resp-${Date.now()}`, ...fallback });
    } catch (fallbackError) {
      // A throw here would be an unhandled rejection and take the whole server down.
      console.error('Local fallback also failed:', fallbackError);
      if (!res.headersSent) res.status(500).json({ error: 'The tutor could not process this message.' });
    }
  }
});



async function startServer() {
  const ai = getGeminiClient();
  initializeRAG(ai).catch((err) => {
    console.error("Failed to initialize RAG", err);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // localhost by default: the Python track runs student code. Set HOST=0.0.0.0 to serve your network.
  const host = process.env.HOST || '127.0.0.1';
  app.listen(PORT, host, () => {
    console.log(`Math Tutor Chatbot Server running on http://${host === '0.0.0.0' ? 'localhost' : host}:${PORT}`);
  });
}

startServer();
