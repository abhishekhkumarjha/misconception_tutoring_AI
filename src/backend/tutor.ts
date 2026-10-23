import { GoogleGenAI, Type } from '@google/genai';
import { classifyStudentIntent, generateLocalPedagogicalResponse } from './conversationEngine.js';

export async function generateTutorResponse(
  ai: GoogleGenAI,
  studentMessage: string,
  studentAttempt: string,
  verifiedResult: any,
  misconception: string,
  pedagogicalStrategy: string,
  retrievedKnowledge: string,
  studentProfile: string,
  history: any[]
) {
  const historyText = history.slice(-4).map((m: any) => `${m.sender}: ${m.text}`).join('\n');

  const prompt = `Generate the next natural tutor response using:
- student message: ${studentMessage}
- student attempt: ${studentAttempt}
- verified mathematical result: ${JSON.stringify(verifiedResult)}
- misconception: ${misconception}
- pedagogical strategy: ${pedagogicalStrategy}
- retrieved knowledge: ${retrievedKnowledge}
- student profile: ${studentProfile}
- conversation history:
${historyText}
You are OTTC Math Tutor, an intelligent, empathetic, and misconception-aware math tutoring system.
Do not contradict the verified mathematical result. Do not reveal the final answer directly unless the student has reached it; guide the student step by step.
Return structured JSON with message and guidingQuestion.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: 'The natural conversational response from the tutor' },
            guidingQuestion: { type: Type.STRING, description: 'A follow-up question or prompt, if applicable' },
          },
          required: ['message', 'guidingQuestion'],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (error) {
    console.warn('Error in tutor (API rate limit/demand), using dataset dialogue fallback');
  }

  const intent = classifyStudentIntent(studentMessage);
  const fallback = generateLocalPedagogicalResponse('Solve for x: 2x + 5 = 15', studentMessage, intent, history);
  return {
    message: fallback.message,
    guidingQuestion: fallback.guidingQuestion,
  };
}

