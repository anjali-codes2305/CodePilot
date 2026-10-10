/**
 * POST /api/chat
 * 
 * Accepts: { code, language, mode, messages, question, codeAnalysis }
 * Returns: { response: string, source: 'codepilot' | 'gemini', deterministic: boolean }
 * 
 * CodePilot Smart Question Router:
 * 1. Checks if question can be answered deterministically from Code Intelligence (0 LLM tokens).
 * 2. If reasoning/pedagogy is needed, routes to Gemini enriched with verified structural context.
 */

import { Router } from 'express';
import { chat } from '../services/aiService.js';
import { routeQuestion } from '../services/smartRouter.js';
import { analyzeCodeStructure } from '../services/analyzer/codeAnalyzer.js';

const router = Router();

const VALID_MODES = ['beginner', 'mentor', 'professional', 'interview'];
const MAX_HISTORY_MESSAGES = 20;

router.post('/', async (req, res) => {
  try {
    const { code, language, mode, messages, question, codeAnalysis: clientAnalysis } = req.body;

    // --- Input Validation ---
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Please enter a question.'
      });
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({
        error: 'No code context found. Please analyze code first.'
      });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        error: 'Language context is missing.'
      });
    }

    const normLang = language.toLowerCase().trim();
    const normMode = (mode || 'mentor').toLowerCase().trim();

    if (!VALID_MODES.includes(normMode)) {
      return res.status(400).json({
        error: 'Learning mode context is missing or invalid.'
      });
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Conversation history is invalid.'
      });
    }

    if (question.length > 2000) {
      return res.status(400).json({
        error: 'Question is too long. Please keep questions under 2,000 characters.'
      });
    }

    // Ensure we have CodePilot's code analysis
    const codeAnalysis = clientAnalysis || analyzeCodeStructure(code.trim(), normLang);

    // ─── Step 1: Smart Deterministic Question Router ───
    const routeDecision = routeQuestion(question.trim(), codeAnalysis);

    if (!routeDecision.shouldCallGemini) {
      // Deterministically answered by CodePilot!
      return res.json({
        response: routeDecision.response,
        source: 'codepilot',
        deterministic: true,
        tokensSaved: 450
      });
    }

    // ─── Step 2: Gemini Grounded Reasoning ───
    const trimmedHistory = messages.slice(-MAX_HISTORY_MESSAGES);

    const aiResponse = await chat(
      code.trim(),
      normLang,
      normMode,
      trimmedHistory,
      question.trim(),
      codeAnalysis
    );

    return res.json({
      response: aiResponse,
      source: 'gemini',
      deterministic: false
    });

  } catch (error) {
    console.error('[/api/chat] Error:', error.message);

    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        error: 'AI service is temporarily busy. Please try again in a moment.'
      });
    }

    return res.status(500).json({
      error: 'Failed to get a response. Please try again.'
    });
  }
});

export default router;
