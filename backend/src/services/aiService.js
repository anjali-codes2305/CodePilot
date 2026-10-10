/**
 * AI Service — all communication with the Gemini AI API.
 * 
 * This module is the single point of contact with the LLM.
 * Routes/controllers never call the AI API directly.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserMessage,
  buildChatSystemPrompt
} from '../prompts/promptBuilder.js';

// Initialize Gemini client (API key stays server-side)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model priority list — prioritizing models with active free quota and fast response
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];

async function callWithFallback(fn) {
  let lastError;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      return await fn(modelName);
    } catch (err) {
      lastError = err;
      const isTemporary = err.message?.includes('503') || 
                          err.message?.includes('high demand') || 
                          err.message?.includes('429');
      if (isTemporary) {
        console.warn(`[AI Service] Model ${modelName} busy/unavailable. Trying next model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Analyzes code using the selected language, learning mode, and verified CodePilot code analysis.
 * Returns a structured markdown explanation.
 * 
 * @param {string} code - User-submitted code
 * @param {string} language - Programming language
 * @param {string} mode - Learning mode (beginner/mentor/professional/interview)
 * @param {object} [codeAnalysis] - Verified CodePilot code analysis
 * @returns {Promise<string>} AI-generated structured explanation
 */
export async function analyzeCode(code, language, mode, codeAnalysis = null) {
  const systemPrompt = buildAnalysisSystemPrompt(language, mode, codeAnalysis);
  const userMessage = buildAnalysisUserMessage(code, language);

  return await callWithFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt
    });

    const result = await model.generateContent(userMessage);
    const response = result.response;

    if (!response) {
      throw new Error('No response received from AI service');
    }

    return response.text();
  });
}

/**
 * Handles a follow-up chat message in the context of the original code.
 * Receives the full conversation history for contextual responses.
 * 
 * @param {string} code - Original submitted code
 * @param {string} language - Programming language
 * @param {string} mode - Learning mode
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @param {string} question - Current user question
 * @param {object} [codeAnalysis] - Verified CodePilot code analysis
 * @returns {Promise<string>} AI-generated response
 */
export async function chat(code, language, mode, messages, question, codeAnalysis = null) {
  const systemPrompt = buildChatSystemPrompt(language, mode, code, codeAnalysis);

  return await callWithFallback(async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt
    });

    // Clean history so current question is sent via sendMessage without duplication
    let pastMessages = Array.isArray(messages) ? [...messages] : [];
    if (pastMessages.length > 0) {
      const last = pastMessages[pastMessages.length - 1];
      if (last && last.role === 'user' && last.content.trim() === question.trim()) {
        pastMessages.pop();
      }
    }

    const history = pastMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chatSession = model.startChat({ history });
    const result = await chatSession.sendMessage(question);
    const response = result.response;

    if (!response) {
      throw new Error('No response received from AI service');
    }

    return response.text();
  });
}

export default { analyzeCode, chat };
