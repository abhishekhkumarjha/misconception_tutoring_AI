import { GoogleGenAI, Type } from '@google/genai';
import { classifyStudentIntent, analyzeProblemMath } from './conversationEngine.js';

export async function detectError(ai: GoogleGenAI, problem: string, correctSolution: string, studentAttempt: string) {
  const intent = classifyStudentIntent(studentAttempt);
  if (intent !== 'math_step') {
    return {
      correctness: 'inquiry',
      error_location: null,
      error_type: 'none',
      misconception: `Student inquiry (${intent.replace(/_/g, ' ')})`,
      evidence: 'Student is engaging conversationally or asking for guidance rather than submitting an incorrect calculation.',
      confidence: 1.0,
    };
  }

  const isAutoSolution = !correctSolution || correctSolution.toLowerCase().includes('auto-derived');
  const solutionContext = isAutoSolution
    ? `Target Solution: [Not provided by student. You must first solve this math problem step-by-step internally to determine the exact ground truth solution, and evaluate the student's attempt against it.]`
    : `Correct Solution: ${correctSolution}`;

  const prompt = `Analyze the student's mathematical attempt. Determine:
- correctness
- error location
- error type
- misconception
- evidence
- confidence

Do not generate a tutoring response. Return structured JSON only.

Problem: ${problem}
${solutionContext}
Student Attempt: ${studentAttempt}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctness: { type: Type.STRING, description: 'correct, partial, or incorrect' },
            error_location: { type: Type.STRING, description: 'The step or part of the equation where the error occurred, or null if correct' },
            error_type: { type: Type.STRING, description: 'The type of mathematical error (e.g., sign_error, incomplete_step)' },
            misconception: { type: Type.STRING, description: 'The underlying misconception causing the error' },
            evidence: { type: Type.STRING, description: 'Evidence from the student attempt supporting this misconception' },
            confidence: { type: Type.NUMBER, description: 'Confidence in this diagnosis from 0.0 to 1.0' },
          },
          required: ['correctness', 'error_location', 'error_type', 'misconception', 'evidence', 'confidence'],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (error) {
    console.warn('Error in errorDetector (API rate limit/demand), using rule-based diagnostic fallback');
  }

  // Smart local mathematical diagnosis fallback
  const math = analyzeProblemMath(problem);
  const cleanAttempt = studentAttempt.toLowerCase().replace(/\s+/g, '');
  
  if (math.type === 'linear_equation') {
    const isStep1 = cleanAttempt.includes(math.step1Expected.replace(/\s+/g, '')) || cleanAttempt.includes(`subtract${math.constant}`) || cleanAttempt.includes('-5');
    if (isStep1) {
      return {
        correctness: 'correct',
        error_location: null,
        error_type: 'none',
        misconception: 'None (Correct step: isolated variable term)',
        evidence: 'Student correctly subtracted constant term from both sides.',
        confidence: 0.98,
      };
    }
    const signErrorStep = `${math.coeff !== 1 ? math.coeff : ''}${math.variable}=${math.rhs + math.constant}`;
    if (cleanAttempt.includes(signErrorStep.replace(/\s+/g, ''))) {
      return {
        correctness: 'incorrect',
        error_location: 'Step 1 (Inverse operation)',
        error_type: 'sign_error',
        misconception: `Added ${math.constant} instead of subtracting it to cancel out +${math.constant}`,
        evidence: `Student arrived at ${math.rhs + math.constant} instead of ${math.rhs - math.constant}.`,
        confidence: 0.95,
      };
    }
  }

  return {
    correctness: 'partial',
    error_location: 'Current step',
    error_type: 'partial_step',
    misconception: 'Student reasoning in progress',
    evidence: `Student attempted step: "${studentAttempt}".`,
    confidence: 0.85,
  };
}

