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
    model: 'gemini-2.5-flash + RAG (55k records + 22k Dialogue Pairs + TalkMoves)',
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

// POST /api/chat - Unified Multi-Subject Socratic Tutoring Pipeline
app.post('/api/chat', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { problem, studentAttempt, isStepByStep = true, history = [], subject } = req.body;

    if (!problem || !studentAttempt) {
      res.status(400).json({ error: 'Missing problem or studentAttempt in request body.' });
      return;
    }

    const determinedSubject =
      subject ||
      (typeof problem === 'object' && problem.subjectType) ||
      (typeof problem === 'object' && problem.starterCode ? 'python' : 'math');

    const baseProblemText = typeof problem === 'string' ? problem : problem.problem || problem.title || '';
    const rawDifficulty = typeof problem === 'object' ? problem.difficulty || 'Medium' : 'Medium';
    const problemLevel = categorizeDifficulty(rawDifficulty);

    let result;

    // ── PYTHON & CROSS-DOMAIN PIPELINE (Enhanced MisconAI Model) ──
    if (determinedSubject === 'python' || (determinedSubject === 'cross_domain' && (studentAttempt.includes('def ') || studentAttempt.includes('for ') || studentAttempt.includes('return') || studentAttempt.includes('print(') || studentAttempt.includes('=')))) {
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
    const intent = classifyStudentIntent(req.body?.studentAttempt || '');
    const fallback = generateLocalPedagogicalResponse(
      typeof req.body?.problem === 'string' ? req.body.problem : req.body?.problem?.problem || '',
      req.body?.studentAttempt || '',
      intent,
      req.body?.history || []
    );
    res.json({ id: `resp-${Date.now()}`, ...fallback });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Math Tutor Chatbot Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
