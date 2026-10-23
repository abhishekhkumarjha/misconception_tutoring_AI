import { GoogleGenAI, Type } from '@google/genai';

export async function planPedagogy(
  ai: GoogleGenAI,
  problem: string,
  correctSolution: string,
  studentAttempt: string,
  detectedMisconception: string,
  studentProfile: string,
  history: any[]
) {
  const historyText = history.slice(-4).map((m: any) => `${m.sender}: ${m.text}`).join('\n');
  const isAutoSolution = !correctSolution || correctSolution.toLowerCase().includes('auto-derived');
  const solutionContext = isAutoSolution
    ? `- correct solution: [Auto-derive from problem statement]`
    : `- correct solution: ${correctSolution}`;

  const prompt = `Given:
- problem: ${problem}
${solutionContext}
- student attempt: ${studentAttempt}
- detected misconception: ${detectedMisconception}
- student profile: ${studentProfile}
- conversation history:
${historyText}

Select the most appropriate teaching strategy. Choose from:
PRESS_FOR_ACCURACY (push student to verify numbers, precision, or specific algebraic steps)
PRESS_FOR_REASONING (ask student to explain their underlying rationale or choice)
REVOICING (restate student's perspective to clarify, then guide)
GETTING_STUDENT_TO_RELATE (ask student to compare options or relate to known definitions)
KEEP_TOGETHER (check in on comprehension or pace before proceeding)
GUIDED_DISCOVERY (ask a leading question to guide student discovery)
HINT (provide a targeted conceptual clue)
CONCEPT_EXPLANATION (clarify a core rule or mathematical property)
COUNTEREXAMPLE (offer a simple case where their reasoning breaks down)
WORKED_EXAMPLE (demonstrate a similar problem structure)
DIRECT_EXPLANATION (clarify confusion directly without giving final answer)
REATTEMPT (encourage trying the step again with renewed focus)
ENCOURAGEMENT (praise effort and boost math confidence)
SUMMARY (synthesize what was learned)

Return structured JSON with strategy, reason, next_goal, difficulty.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategy: { type: Type.STRING, description: 'The selected pedagogical strategy' },
            reason: { type: Type.STRING, description: 'Why this strategy was chosen' },
            next_goal: { type: Type.STRING, description: 'The immediate learning goal for the student' },
            difficulty: { type: Type.STRING, description: 'The intended difficulty of the response (e.g., low, medium, high)' },
          },
          required: ['strategy', 'reason', 'next_goal', 'difficulty'],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (error) {
    console.error('Error in pedagogicalPlanner:', error);
  }

  return {
    strategy: 'GUIDED_DISCOVERY',
    reason: 'Fallback to guided discovery questioning on error',
    next_goal: 'Prompt student for next step',
    difficulty: 'medium',
  };
}
