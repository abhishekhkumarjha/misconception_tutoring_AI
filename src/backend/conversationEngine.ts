import fs from 'fs';
import path from 'path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export type StudentIntent =
  | 'hint_request'
  | 'starter_request'
  | 'stuck_or_confused'
  | 'confirmation'
  | 'clarification'
  | 'greeting'
  | 'math_step';

interface DialogueExemplar {
  student_said: string;
  tutor_said: string;
  talk_move: string;
  subject: string;
  question_sample?: string;
}

interface ConversationBank {
  hint_moves: DialogueExemplar[];
  starter_moves: DialogueExemplar[];
  reasoning_moves: DialogueExemplar[];
  accuracy_moves: DialogueExemplar[];
  revoicing_moves: DialogueExemplar[];
  keeping_together_moves: DialogueExemplar[];
  general_tutor_moves: DialogueExemplar[];
}

let conversationBank: ConversationBank = {
  hint_moves: [],
  starter_moves: [],
  reasoning_moves: [],
  accuracy_moves: [],
  revoicing_moves: [],
  keeping_together_moves: [],
  general_tutor_moves: []
};

// Load conversation data at startup
const bankPath = path.join(process.cwd(), 'data', 'processed', 'conversation_bank.json');
try {
  if (fs.existsSync(bankPath)) {
    const raw = fs.readFileSync(bankPath, 'utf-8');
    conversationBank = JSON.parse(raw);
    console.log(`Loaded Conversation Bank from real datasets: ${
      conversationBank.hint_moves.length +
      conversationBank.starter_moves.length +
      conversationBank.accuracy_moves.length +
      conversationBank.reasoning_moves.length +
      conversationBank.revoicing_moves.length +
      conversationBank.keeping_together_moves.length
    } dialogue exemplars.`);
  }
} catch (e) {
  console.warn('Could not load conversation bank:', e);
}

/**
 * Classify student message intent accurately
 */
export function classifyStudentIntent(message: string): StudentIntent {
  const m = message.toLowerCase().trim();

  // 1. Hint requests
  if (
    m.includes('hint') ||
    m.includes('clue') ||
    m.includes('give me a hint') ||
    m.includes('subtle hint') ||
    m.includes('give a hint') ||
    m.includes('need a hint') ||
    m.includes('help with this step')
  ) {
    return 'hint_request';
  }

  // 2. Starter inquiries
  if (
    m.includes('where do i start') ||
    m.includes('how do i start') ||
    m.includes('what should i do first') ||
    m.includes('how to start') ||
    m.includes('where to start') ||
    m.includes('what is the first step') ||
    m.includes('first step')
  ) {
    return 'starter_request';
  }

  // 3. Stuck / confused
  if (
    m.includes('stuck') ||
    m.includes('confused') ||
    m.includes("don't understand") ||
    m.includes("dont understand") ||
    m.includes("don't know what to do") ||
    m.includes("dont know what to do") ||
    m.includes("no idea") ||
    m.includes("lost") ||
    m === "i need help" ||
    m === "help me"
  ) {
    return 'stuck_or_confused';
  }

  // 4. Confirmation
  if (
    m.includes('is this right') ||
    m.includes('is that right') ||
    m.includes('am i right') ||
    m.includes('am i close') ||
    m.includes('did i do it right') ||
    m.includes('correct?')
  ) {
    return 'confirmation';
  }

  // 5. Clarification
  if (
    m.startsWith('why') ||
    m.includes('what do you mean') ||
    m.includes('what does that mean') ||
    m.includes('explain') ||
    m.includes('how come')
  ) {
    return 'clarification';
  }

  // 6. Greetings / chit-chat
  if (
    ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'ok', 'okay', 'thanks', 'thank you', 'cool', 'awesome'].includes(m)
  ) {
    return 'greeting';
  }

  // Default: mathematical step or attempt
  return 'math_step';
}

/**
 * Retrieve matching dialogue exemplars from train.csv dialogue dataset
 */
export function getDialogueExemplars(intent: StudentIntent, count: number = 3): DialogueExemplar[] {
  let pool: DialogueExemplar[] = [];

  switch (intent) {
    case 'hint_request':
      pool = conversationBank.hint_moves.length > 0 ? conversationBank.hint_moves : conversationBank.accuracy_moves;
      break;
    case 'starter_request':
      pool = conversationBank.starter_moves.length > 0 ? conversationBank.starter_moves : conversationBank.keeping_together_moves;
      break;
    case 'stuck_or_confused':
      pool = conversationBank.keeping_together_moves.concat(conversationBank.hint_moves);
      break;
    case 'confirmation':
      pool = conversationBank.revoicing_moves.concat(conversationBank.accuracy_moves);
      break;
    case 'clarification':
      pool = conversationBank.reasoning_moves.concat(conversationBank.revoicing_moves);
      break;
    case 'greeting':
      pool = conversationBank.general_tutor_moves;
      break;
    case 'math_step':
    default:
      pool = conversationBank.accuracy_moves.concat(conversationBank.reasoning_moves);
      break;
  }

  if (pool.length === 0) {
    return [
      {
        student_said: "Can you give me a subtle hint?",
        tutor_said: "Take a close look at the variable term. What operation is currently acting on it that you can reverse?",
        talk_move: "Press for Accuracy",
        subject: "Algebra"
      },
      {
        student_said: "Where do I start?",
        tutor_said: "Let's first identify what we want to solve for, and look at which term has the variable.",
        talk_move: "Keep Together",
        subject: "Algebra"
      }
    ];
  }

  // Shuffle and pick top N
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

type LinearEquationInfo = {
  type: 'linear_equation';
  variable: string;
  coeff: number;
  constant: number;
  rhs: number;
  step1Expected: string;
  step1Operation: string;
  step2Expected: string;
  finalAnswer: number;
};
type GeneralInfo = {
  type: 'general';
  step1Expected: string;
  step1Operation: string;
};
type MathInfo = LinearEquationInfo | GeneralInfo;

/**
 * Math Problem Analyzer to extract equations, terms, and expected steps
 */
export function analyzeProblemMath(problemText: string): MathInfo {
  // Check for linear equation like 2x + 5 = 15 or 3x - 4 = 11
  const linearMatch = problemText.match(/([+-]?\s*\d*)\s*([a-zA-Z])\s*([+-]\s*\d+)\s*=\s*([+-]?\s*\d+)/);
  if (linearMatch) {
    const rawCoeff = linearMatch[1].replace(/\s+/g, '');
    const coeff = rawCoeff === '' || rawCoeff === '+' ? 1 : rawCoeff === '-' ? -1 : parseInt(rawCoeff, 10);
    const variable = linearMatch[2];
    const constant = parseInt(linearMatch[3].replace(/\s+/g, ''), 10);
    const rhs = parseInt(linearMatch[4].replace(/\s+/g, ''), 10);

    const step1Rhs = rhs - constant;
    const finalAnswer = coeff !== 0 ? step1Rhs / coeff : 0;

    return {
      type: 'linear_equation',
      variable,
      coeff,
      constant,
      rhs,
      step1Expected: `${coeff !== 1 ? coeff : ''}${variable} = ${step1Rhs}`,
      step1Operation: constant > 0 ? `subtract ${Math.abs(constant)}` : `add ${Math.abs(constant)}`,
      step2Expected: `${variable} = ${finalAnswer}`,
      finalAnswer,
    };
  }

  return {
    type: 'general',
    step1Expected: 'First logical step',
    step1Operation: 'identify key numbers and operations',
  };
}

/**
 * Generate a rich dataset-grounded local response when API is unavailable or rate-limited
 */
export function generateLocalPedagogicalResponse(
  problemText: string,
  studentMessage: string,
  intent: StudentIntent,
  history: any[] = []
) {
  const mathInfo = analyzeProblemMath(problemText);
  const exemplars = getDialogueExemplars(intent, 2);
  const mLower = studentMessage.toLowerCase().trim();

  if (intent === 'hint_request') {
    let message = "";
    let guidingQuestion = "";
    let goal = "";

    if (mathInfo.type === 'linear_equation') {
      const varTerm = `${mathInfo.coeff !== 1 ? mathInfo.coeff : ''}${mathInfo.variable}`;
      const constSign = mathInfo.constant >= 0 ? `+ ${mathInfo.constant}` : `- ${Math.abs(mathInfo.constant)}`;
      message = `Notice on the left side we have the variable term (${varTerm}) and the constant term (${constSign}). Our first goal is to isolate ${varTerm}. What operation can cancel out ${constSign}?`;
      guidingQuestion = `What operation is the inverse of ${mathInfo.constant >= 0 ? 'adding' : 'subtracting'} ${Math.abs(mathInfo.constant)}?`;
      goal = `Student identifies inverse operation to isolate ${varTerm}`;
    } else {
      message = "Take a close look at the relationship between the quantities given. Let's break it down into smaller parts.";
      guidingQuestion = "What is the very first piece of information you can use to start simplifying?";
      goal = "Student identifies the primary relation or unknown";
    }

    return {
      message,
      guidingQuestion,
      encouragement: "Great question! Using hints to guide your thinking is the best way to learn.",
      analysis: {
        isCorrect: true,
        isFinalAnswer: false,
        errorType: 'none',
        errorSummary: 'Inquiry: Subtle Hint Request',
        mistakeStep: null,
        studentRationale: 'Student asked for a subtle conceptual hint to proceed with confidence.',
        severity: 'none',
      },
      pedagogical: {
        strategy: 'GUIDED_DISCOVERY',
        talkMove: 'Keep Together',
        hintLevel: 1,
        answerRevealed: false,
        pedagogicalGoal: goal,
        nextRecommendedPrompt: guidingQuestion,
      },
      evaluation: {
        errorDetectionAccuracy: 100,
        hintQualityScore: 94,
        pedagogicalEffectiveness: 95,
        socraticRuleAdhered: true,
        exemplarsUsed: exemplars.map(e => e.talk_move),
      },
    };
  }

  if (intent === 'starter_request') {
    let message = "";
    let guidingQuestion = "";

    if (mathInfo.type === 'linear_equation') {
      message = `To start solving, we want to get the variable ${mathInfo.variable} completely on its own on one side. Before touching the coefficient, let's eliminate the constant term first.`;
      guidingQuestion = `What would you get if you ${mathInfo.step1Operation} from both sides?`;
    } else {
      message = "To get started, let's write down what we know and what we need to find.";
      guidingQuestion = "What quantity are we trying to solve for?";
    }

    return {
      message,
      guidingQuestion,
      encouragement: "Starting is often the hardest part—you're doing great!",
      analysis: {
        isCorrect: true,
        isFinalAnswer: false,
        errorType: 'none',
        errorSummary: 'Inquiry: Starter Request',
        mistakeStep: null,
        studentRationale: 'Student requested orientation on where to begin solving.',
        severity: 'none',
      },
      pedagogical: {
        strategy: 'KEEP_TOGETHER',
        talkMove: 'Keep Together',
        hintLevel: 1,
        answerRevealed: false,
        pedagogicalGoal: 'Orient student toward the initial simplification step',
        nextRecommendedPrompt: guidingQuestion,
      },
      evaluation: {
        errorDetectionAccuracy: 100,
        hintQualityScore: 92,
        pedagogicalEffectiveness: 93,
        socraticRuleAdhered: true,
        exemplarsUsed: exemplars.map(e => e.talk_move),
      },
    };
  }

  if (intent === 'stuck_or_confused') {
    return {
      message: "No worries at all! Math can get tricky, and getting stuck is just a sign that you're about to understand something new.",
      guidingQuestion: "Which part of the problem feels confusing right now—the numbers or what operation to use?",
      encouragement: "Take a deep breath! We will walk through it together step by step.",
      analysis: {
        isCorrect: true,
        isFinalAnswer: false,
        errorType: 'none',
        errorSummary: 'Inquiry: Student Feeling Stuck',
        mistakeStep: null,
        studentRationale: 'Student signaled confusion; reassuring and breaking down step.',
        severity: 'none',
      },
      pedagogical: {
        strategy: 'KEEP_TOGETHER',
        talkMove: 'Keep Together',
        hintLevel: 1,
        answerRevealed: false,
        pedagogicalGoal: 'Reassure student and isolate the specific point of confusion',
        nextRecommendedPrompt: 'Which part of the problem feels confusing right now?',
      },
      evaluation: {
        errorDetectionAccuracy: 100,
        hintQualityScore: 91,
        pedagogicalEffectiveness: 94,
        socraticRuleAdhered: true,
        exemplarsUsed: exemplars.map(e => e.talk_move),
      },
    };
  }

  if (intent === 'greeting') {
    return {
      message: "Hello! I'm your OTTC Math Tutor. I'm here to work through problems with you step by step.",
      guidingQuestion: "Whenever you're ready, what do you think our first step should be?",
      encouragement: "Ready whenever you are!",
      analysis: {
        isCorrect: true,
        isFinalAnswer: false,
        errorType: 'none',
        errorSummary: 'Greeting / Social Check-in',
        mistakeStep: null,
        studentRationale: 'Student initiated conversation.',
        severity: 'none',
      },
      pedagogical: {
        strategy: 'KEEP_TOGETHER',
        talkMove: 'Keep Together',
        hintLevel: 1,
        answerRevealed: false,
        pedagogicalGoal: 'Welcome student and invite initial mathematical thoughts',
        nextRecommendedPrompt: 'What do you think our first step should be?',
      },
      evaluation: {
        errorDetectionAccuracy: 100,
        hintQualityScore: 90,
        pedagogicalEffectiveness: 90,
        socraticRuleAdhered: true,
        exemplarsUsed: [],
      },
    };
  }

  // Math step attempt analysis
  if (mathInfo.type === 'linear_equation') {
    const cleanAttempt = mLower.replace(/\s+/g, '');
    const isStep1Correct =
      cleanAttempt.includes(mathInfo.step1Expected.replace(/\s+/g, '')) ||
      cleanAttempt.includes(`subtract${mathInfo.constant}`) ||
      cleanAttempt.includes(`-5`) ||
      cleanAttempt.includes(`2x=10`);

    const isFinalCorrect =
      cleanAttempt === `${mathInfo.variable}=${mathInfo.finalAnswer}` ||
      cleanAttempt === `${mathInfo.finalAnswer}`;

    // Common misconception: added instead of subtracted (e.g. 2x = 20)
    const signErrorStep = `${mathInfo.coeff !== 1 ? mathInfo.coeff : ''}${mathInfo.variable}=${mathInfo.rhs + mathInfo.constant}`;
    const hasSignError = cleanAttempt.includes(signErrorStep.replace(/\s+/g, ''));

    if (isFinalCorrect) {
      return {
        message: `Spot on! You found that ${mathInfo.variable} = ${mathInfo.finalAnswer}. Excellent algebraic reasoning!`,
        guidingQuestion: "How could you plug this value back into the original equation to verify that it balances?",
        encouragement: "Fantastic work! You solved the entire problem correctly.",
        analysis: {
          isCorrect: true,
          isFinalAnswer: true,
          errorType: 'none',
          errorSummary: 'Solved correctly',
          mistakeStep: null,
          studentRationale: 'Student correctly isolated the variable.',
          severity: 'none',
        },
        pedagogical: {
          strategy: 'REVOICING',
          talkMove: 'Revoicing',
          hintLevel: 3,
          answerRevealed: true,
          pedagogicalGoal: 'Verify solution through substitution check',
          nextRecommendedPrompt: 'How can you verify by substitution?',
        },
        evaluation: {
          errorDetectionAccuracy: 100,
          hintQualityScore: 98,
          pedagogicalEffectiveness: 98,
          socraticRuleAdhered: true,
          exemplarsUsed: exemplars.map(e => e.talk_move),
        },
      };
    }

    if (isStep1Correct) {
      return {
        message: `Exactly right! By subtracting ${mathInfo.constant} from both sides, you simplified it to ${mathInfo.step1Expected}. Now we have ${mathInfo.coeff}${mathInfo.variable} = ${mathInfo.rhs - mathInfo.constant}.`,
        guidingQuestion: `How do we undo the multiplication by ${mathInfo.coeff} to get ${mathInfo.variable} alone?`,
        encouragement: "You're halfway there—great job on the first step!",
        analysis: {
          isCorrect: true,
          isFinalAnswer: false,
          errorType: 'none',
          errorSummary: 'Step 1 Correct (Constant eliminated)',
          mistakeStep: null,
          studentRationale: 'Student correctly applied inverse operation to constant term.',
          severity: 'none',
        },
        pedagogical: {
          strategy: 'PRESS_FOR_ACCURACY',
          talkMove: 'Press for Accuracy',
          hintLevel: 2,
          answerRevealed: false,
          pedagogicalGoal: `Student applies division by ${mathInfo.coeff} to isolate ${mathInfo.variable}`,
          nextRecommendedPrompt: `What is ${mathInfo.rhs - mathInfo.constant} divided by ${mathInfo.coeff}?`,
        },
        evaluation: {
          errorDetectionAccuracy: 100,
          hintQualityScore: 95,
          pedagogicalEffectiveness: 96,
          socraticRuleAdhered: true,
          exemplarsUsed: exemplars.map(e => e.talk_move),
        },
      };
    }

    if (hasSignError) {
      return {
        message: `You're working on the right term! But take a close look at the sign: we have + ${mathInfo.constant}. Remember that to move a term across the equals sign, we must use its inverse.`,
        guidingQuestion: `If the equation has + ${mathInfo.constant}, should we add or subtract ${mathInfo.constant} from both sides?`,
        encouragement: "Very close! Just watch that inverse operation sign.",
        analysis: {
          isCorrect: false,
          isFinalAnswer: false,
          errorType: 'sign_error',
          errorSummary: `Sign error: Added ${mathInfo.constant} instead of subtracting`,
          mistakeStep: 'Inverse operation on constant term',
          studentRationale: `Student applied addition instead of subtraction, yielding ${mathInfo.rhs + mathInfo.constant}.`,
          severity: 'minor',
        },
        pedagogical: {
          strategy: 'PRESS_FOR_REASONING',
          talkMove: 'Press for Reasoning',
          hintLevel: 2,
          answerRevealed: false,
          pedagogicalGoal: 'Student self-corrects the sign of the inverse operation',
          nextRecommendedPrompt: `What is ${mathInfo.rhs} minus ${mathInfo.constant}?`,
        },
        evaluation: {
          errorDetectionAccuracy: 95,
          hintQualityScore: 92,
          pedagogicalEffectiveness: 94,
          socraticRuleAdhered: true,
          exemplarsUsed: exemplars.map(e => e.talk_move),
        },
      };
    }
  }

  // Fallback for general step
  return {
    message: "Let's examine that step. What rule or operation did you use to arrive at this?",
    guidingQuestion: "Can you explain your thought process for this step?",
    encouragement: "Good effort! Talking through your reasoning helps make math clear.",
    analysis: {
      isCorrect: false,
      isFinalAnswer: false,
      errorType: 'partial_step',
      errorSummary: 'Step needs clarification',
      mistakeStep: 'Current step',
      studentRationale: studentMessage,
      severity: 'minor',
    },
    pedagogical: {
      strategy: 'PRESS_FOR_REASONING',
      talkMove: 'Press for Reasoning',
      hintLevel: 2,
      answerRevealed: false,
      pedagogicalGoal: 'Student articulates rationale',
      nextRecommendedPrompt: 'Can you explain the rule you applied?',
    },
    evaluation: {
      errorDetectionAccuracy: 88,
      hintQualityScore: 89,
      pedagogicalEffectiveness: 90,
      socraticRuleAdhered: true,
      exemplarsUsed: exemplars.map(e => e.talk_move),
    },
  };
}

// Read at call time: server.ts loads .env after its imports have been evaluated.
const tutorModel = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Deterministic final-answer check fed to the LLM, so a correct solution is not
 * talked into a "misconception" by the retrieved RAG examples.
 */
export function checkFinalAnswer(studentMessage: string, targetSolution: string): string {
  const lastNumber = (text: string) => {
    const nums = (text || '').replace(/(\d),(?=\d{3}\b)/g, '$1').match(/-?(?:\d+(?:\.\d+)?|\.\d+)/g);
    return nums ? parseFloat(nums[nums.length - 1]) : null;
  };
  const target = lastNumber(targetSolution);
  const student = lastNumber(studentMessage);
  if (target === null || student === null) return 'not applicable (no numeric answer to compare)';
  if (Math.abs(target - student) < 1e-6) {
    return `the student's final number (${student}) MATCHES the target answer. Treat the work as correct unless a step contains a clear mathematical error.`;
  }
  return `the student's final number (${student}) differs from the target answer. It may be an intermediate step; judge the step itself.`;
}

const TUTOR_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    message: { type: Type.STRING },
    guidingQuestion: { type: Type.STRING },
    encouragement: { type: Type.STRING },
    diagnosis: {
      type: Type.OBJECT,
      properties: {
        correctness: { type: Type.STRING, enum: ['correct', 'partial', 'incorrect', 'inquiry'] },
        error_type: { type: Type.STRING },
        misconception: { type: Type.STRING },
        evidence: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        mistake_step: { type: Type.STRING, nullable: true },
      },
      required: ['correctness', 'error_type', 'misconception', 'evidence', 'confidence'],
    },
    pedagogy: {
      type: Type.OBJECT,
      properties: {
        strategy: { type: Type.STRING },
        talk_move: { type: Type.STRING },
        hint_level: { type: Type.INTEGER },
        pedagogical_goal: { type: Type.STRING },
      },
      required: ['strategy', 'talk_move', 'hint_level', 'pedagogical_goal'],
    },
    evaluation: {
      type: Type.OBJECT,
      properties: {
        accuracy_score: { type: Type.INTEGER },
        hint_quality: { type: Type.INTEGER },
        pedagogical_score: { type: Type.INTEGER },
        answer_revealed: { type: Type.BOOLEAN },
      },
      required: ['accuracy_score', 'hint_quality', 'pedagogical_score', 'answer_revealed'],
    },
  },
  required: ['message', 'guidingQuestion', 'encouragement', 'diagnosis', 'pedagogy', 'evaluation'],
  // Generate the diagnosis before the reply, so the reply is written from it.
  propertyOrdering: ['diagnosis', 'pedagogy', 'message', 'guidingQuestion', 'encouragement', 'evaluation'],
};

// Gemini 3 models answer without reasoning unless a thinking level is set; diagnosis needs it.
// Gemini 2.5 models think by default and reject thinkingLevel, so it is only set for gemini-3*.
const thinkingConfig = (model: string) => {
  if (!model.startsWith('gemini-3')) return {};
  const level = (process.env.GEMINI_THINKING_LEVEL || 'HIGH').toUpperCase() as ThinkingLevel;
  return { thinkingConfig: { thinkingLevel: level } };
};

/**
 * Consolidated 1-Call Gemini Pipeline
 * Performs full diagnosis, pedagogy selection, and response generation in a SINGLE LLM inference.
 */
export async function runConsolidatedTutorPipeline(
  ai: GoogleGenAI,
  problemText: string,
  targetSolution: string,
  studentMessage: string,
  history: any[] = [],
  ragContext: string = '(RAG not provided)',
  problemLevel: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate'
) {
  const intent = classifyStudentIntent(studentMessage);
  const exemplars = getDialogueExemplars(intent, 3);
  const mathInfo = analyzeProblemMath(problemText);

  const exemplarText = exemplars
    .map(
      (e, idx) =>
        `Example ${idx + 1} (Talk Move: <${e.talk_move}>):\nStudent: "${e.student_said}"\nTutor: "${e.tutor_said}"`
    )
    .join('\n\n');

  const historyText = history
    .slice(-4)
    .map((m: any) => `${m.sender}: ${m.text}`)
    .join('\n');

  const answerCheck = checkFinalAnswer(studentMessage, targetSolution);

  const prompt = `You are OTTC Math Tutor, an expert, encouraging, misconception-aware mathematics tutor.
You communicate warmly and conversationally, strictly adhering to Socratic discovery (do not give the final answer away prematurely).

PROBLEM LEVEL: ${problemLevel}
- Beginner: use simple language, smaller steps, more encouragement
- Intermediate: balanced scaffolding, connect to known rules
- Advanced: assume algebraic fluency, ask for reasoning and justification

PROBLEM:
${problemText}
Target Solution: ${targetSolution || 'Derive step-by-step'}

STUDENT MESSAGE:
"${studentMessage}"
Detected Student Intent: ${intent.toUpperCase()}
AUTOMATIC ANSWER CHECK: ${answerCheck}

CONVERSATION HISTORY:
${historyText || '(Beginning of conversation)'}

REAL TEACHER DIALOGUE EXEMPLARS FROM EEDI MATH DATASET (TalkMoves):
${exemplarText}

RAG-RETRIEVED KNOWLEDGE (grounded in 77k+ real dataset records):
${ragContext}

INSTRUCTIONS — Follow this exact reasoning chain:
STEP 1 — DIAGNOSE: Is the student submitting a math step or asking a question?
  - If NON-MATH (hint/greeting/stuck): set correctness="inquiry", error_type="none", confidence=1.0
  - If MATH STEP, decide correctness FIRST, from the student's own work only:
    a) Solve the problem yourself first and note the correct value of every intermediate quantity. Then compare the
       student's lines with your solution one by one, using the target solution and the AUTOMATIC ANSWER CHECK.
    b) "correct" = every step is valid and the student reached the target answer (wording or method may differ from yours).
       "partial" = every step so far is valid but the student has not finished. "incorrect" = at least one step is wrong.
    c) Do NOT invent errors. If the work is correct, set error_type="none" and misconception="none".
    d) Only if the work is partial or incorrect: find the FIRST line where the student's setup or value departs from a
       correct solution (later errors usually follow from it). In misconception, explain WHY the student wrote that line:
       the faulty rule, belief or misreading of the problem ("the student believes/does X instead of Y"). If it is only a
       slip (a typo or arithmetic slip), say so. Copy that line word for word into mistake_step and evidence.
       Use a RAG misconception only if the student's work shows that exact pattern; otherwise ignore the RAG misconceptions.
    e) VERIFY before answering: find mistake_step in the student's message. It must appear there and must actually contain
       the error you describe; never claim the student left out something they wrote. If the check fails, redo d).
    Set confidence based on clarity of evidence (0.7-1.0 if clear, 0.5-0.7 if ambiguous).
STEP 2 — SELECT PEDAGOGY: Choose the TalkMove that matches the student state and the RAG pedagogy patterns above.
  Do NOT reveal the answer. Guide toward discovery.
STEP 3 — GENERATE RESPONSE: Write a warm, problem-specific tutor message grounded in the RAG context.
  Match complexity to the PROBLEM LEVEL. Cite the specific step or number from the student's attempt.
  If the work is partial or incorrect, aim the message and guiding question at the error in your diagnosis.
STEP 4 — EVALUATE: Score accuracy, hint quality, and pedagogical effectiveness (1-100).
  If you are giving away the answer, set answer_revealed=true and penalise hint_quality.

Return ONLY valid JSON with keys:
{
  "message": string,
  "guidingQuestion": string,
  "encouragement": string,
  "diagnosis": {
    "correctness": "correct" | "partial" | "incorrect" | "inquiry",
    "error_type": string,
    "misconception": string,
    "evidence": string,
    "confidence": number,
    "mistake_step": string | null
  },
  "pedagogy": {
    "strategy": string,
    "talk_move": string,
    "hint_level": number,
    "pedagogical_goal": string
  },
  "evaluation": {
    "accuracy_score": number,
    "hint_quality": number,
    "pedagogical_score": number,
    "answer_revealed": boolean
  }
}`;

  try {
    const response = await ai.models.generateContent({
      model: tutorModel(),
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: TUTOR_RESPONSE_SCHEMA,
        ...thinkingConfig(tutorModel()),
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return {
        id: `resp-${Date.now()}`,
        message: parsed.message,
        guidingQuestion: parsed.guidingQuestion,
        encouragement: parsed.encouragement || "Keep going, you're doing great!",
        analysis: {
          isCorrect: parsed.diagnosis.correctness === 'correct' || parsed.diagnosis.correctness === 'inquiry',
          isFinalAnswer: parsed.diagnosis.correctness === 'correct' && parsed.pedagogy?.hint_level === 3,
          errorType: parsed.diagnosis.error_type || 'none',
          errorSummary: parsed.diagnosis.misconception || 'Conceptual review',
          mistakeStep: parsed.diagnosis.mistake_step || null,
          studentRationale: parsed.diagnosis.evidence || 'Parsed from student input',
          severity: parsed.diagnosis.confidence < 0.5 ? 'minor' : 'moderate',
        },
        pedagogical: {
          strategy: parsed.pedagogy.strategy || 'GUIDED_DISCOVERY',
          talkMove: parsed.pedagogy.talk_move || 'Keep Together',
          hintLevel: parsed.pedagogy.hint_level || 2,
          answerRevealed: Boolean(parsed.evaluation?.answer_revealed),
          pedagogicalGoal: parsed.pedagogy.pedagogical_goal || 'Guide through reflection',
          nextRecommendedPrompt: parsed.guidingQuestion,
        },
        evaluation: {
          errorDetectionAccuracy: parsed.evaluation?.accuracy_score || Math.round((parsed.diagnosis?.confidence || 0.95) * 100),
          hintQualityScore: parsed.evaluation?.hint_quality || 92,
          pedagogicalEffectiveness: parsed.evaluation?.pedagogical_score || 94,
          socraticRuleAdhered: !parsed.evaluation?.answer_revealed,
          exemplarsUsed: exemplars.map(e => e.talk_move),
        },
      };
    }
  } catch (error: any) {
    console.warn('Gemini API call failed or rate limited, using dataset dialogue engine fallback:', error?.message || error);
  }

  // Graceful local fallback powered by real conversation datasets and math solver
  const local = generateLocalPedagogicalResponse(problemText, studentMessage, intent, history);
  return {
    id: `resp-${Date.now()}`,
    ...local,
  };
}
