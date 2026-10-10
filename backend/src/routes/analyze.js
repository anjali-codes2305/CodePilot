/**
 * POST /api/analyze
 * 
 * High-Performance Analysis Pipeline:
 * 1. Analysis & Token Cache Check (Section 43 - 0 LLM Tokens on repeated calls)
 * 2. CodePilot Code Intelligence Layer (AST / Multi-language Sanitized Parser)
 * 3. Deterministic Complexity Engine & Control Flow Graph
 * 4. Step-by-Step Execution Tracer & Practice/Interview Modules
 * 5. Grounded Gemini AI Teaching Layer
 * 6. Cache population & Structured Response
 */

import { Router } from 'express';
import { analyzeCode } from '../services/aiService.js';
import { analyzeCodeStructure } from '../services/analyzer/codeAnalyzer.js';
import { traceExecution } from '../services/execution/executionTracer.js';
import { generatePracticeQuiz, generateInterviewQuestions } from '../services/practiceService.js';
import { normalizeAnalysisResponse } from '../services/analyzer/responseNormalizer.js';
import { analysisCache } from '../services/cache/analysisCache.js';

const router = Router();

// Supported modes
const VALID_MODES = ['beginner', 'mentor', 'professional', 'interview'];

// Supported languages
const VALID_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'c++',
  'cpp', 'c#', 'csharp', 'go', 'rust', 'kotlin', 'swift', 'php', 'ruby'
];

router.post('/', async (req, res) => {
  try {
    const { code, language, mode } = req.body;

    // --- Input Validation ---
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({
        error: 'Please provide code to analyze. The code field cannot be empty.'
      });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        error: 'Please select a programming language.'
      });
    }

    const normalizedLanguage = language.toLowerCase().trim();
    if (!VALID_LANGUAGES.includes(normalizedLanguage)) {
      return res.status(400).json({
        error: `Language "${language}" is not currently supported. Supported languages: ${VALID_LANGUAGES.join(', ')}.`
      });
    }

    if (!mode || typeof mode !== 'string') {
      return res.status(400).json({
        error: 'Please select a learning mode.'
      });
    }

    const normalizedMode = mode.toLowerCase().trim();
    if (!VALID_MODES.includes(normalizedMode)) {
      return res.status(400).json({
        error: `Mode "${mode}" is not valid. Valid modes: ${VALID_MODES.join(', ')}.`
      });
    }

    if (code.length > 50000) {
      return res.status(400).json({
        error: 'Code is too long. Please submit code under 50,000 characters.'
      });
    }

    const trimmedCode = code.trim();

    // ─── Step 1: Cache Check (Section 43) ───
    const cachedResponse = analysisCache.get(trimmedCode, normalizedLanguage, normalizedMode);
    if (cachedResponse) {
      return res.json({
        ...cachedResponse,
        cached: true
      });
    }

    // ─── Step 2: CodePilot Code Intelligence Layer ───
    const codeAnalysis = analyzeCodeStructure(trimmedCode, normalizedLanguage);

    // ─── Step 3: Execution Tracer ───
    const executionTrace = traceExecution(trimmedCode, normalizedLanguage);

    // ─── Step 4: Practice & Interview Generation ───
    const practiceQuiz = generatePracticeQuiz(codeAnalysis, trimmedCode);
    const interviewQuestions = generateInterviewQuestions(codeAnalysis, trimmedCode);

    // ─── Step 5: Grounded AI Analysis with Gemini ───
    const analysis = await analyzeCode(trimmedCode, normalizedLanguage, normalizedMode, codeAnalysis);

    // ─── Step 6: Structured Response Normalization (Section 13) ───
    const structuredSections = normalizeAnalysisResponse(analysis, codeAnalysis);

    const payload = {
      analysis,
      structuredSections,
      codeAnalysis,
      executionTrace,
      practiceQuiz,
      interviewQuestions
    };

    // Store in cache for instant sub-millisecond reuse
    analysisCache.set(trimmedCode, normalizedLanguage, normalizedMode, payload);

    return res.json({
      ...payload,
      cached: false
    });

  } catch (error) {
    console.error('[/api/analyze] Error:', error.message);

    if (error.message?.includes('API_KEY')) {
      return res.status(500).json({
        error: 'AI service configuration error. Please contact support.'
      });
    }

    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        error: 'AI service is temporarily busy. Please try again in a moment.'
      });
    }

    return res.status(500).json({
      error: 'Failed to analyze code. Please try again.'
    });
  }
});

export default router;
