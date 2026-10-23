import { GoogleGenAI, Type } from '@google/genai';

export async function evaluateTutorResponse(
  ai: GoogleGenAI,
  tutorResponse: string,
  problem: string,
  studentAttempt: string,
  misconception: string,
  pedagogicalStrategy: string
) {
  const prompt = `Evaluate the tutor response.
Check:
1. Mathematical correctness
2. Relevance
3. Misconception alignment
4. Pedagogical appropriateness
5. Whether the response gives away the answer prematurely
6. Naturalness
7. Clarity
8. Student-level appropriateness

Return scores (1-10) and specific errors in JSON.

Tutor Response: ${tutorResponse}
Problem: ${problem}
Student Attempt: ${studentAttempt}
Misconception: ${misconception}
Pedagogical Strategy: ${pedagogicalStrategy}
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
            mathematical_correctness: { type: Type.INTEGER },
            relevance: { type: Type.INTEGER },
            misconception_alignment: { type: Type.INTEGER },
            pedagogical_appropriateness: { type: Type.INTEGER },
            gives_away_answer: { type: Type.BOOLEAN },
            naturalness: { type: Type.INTEGER },
            clarity: { type: Type.INTEGER },
            overall_score: { type: Type.INTEGER },
            specific_errors: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'mathematical_correctness',
            'relevance',
            'misconception_alignment',
            'pedagogical_appropriateness',
            'gives_away_answer',
            'naturalness',
            'clarity',
            'overall_score',
            'specific_errors',
          ],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (error) {
    console.error('Error in evaluator:', error);
  }

  return {
    mathematical_correctness: 5,
    relevance: 5,
    misconception_alignment: 5,
    pedagogical_appropriateness: 5,
    gives_away_answer: false,
    naturalness: 5,
    clarity: 5,
    overall_score: 5,
    specific_errors: ['Failed to evaluate'],
  };
}
