/**
 * Prompt builder — assembles the full AI prompt from modular pieces.
 * 
 * Architecture:
 *   Base System Instructions
 *   + Mode Instructions
 *   + Language Context
 *   + CodePilot Verified Code Intelligence Context
 *   + Code Context
 *   + [For chat: Conversation History + Current Question]
 */

import BASE_INSTRUCTIONS from './baseInstructions.js';
import { MODE_INSTRUCTIONS } from './modeInstructions.js';

function formatCodeAnalysisContext(codeAnalysis) {
  if (!codeAnalysis) return '';

  const parts = ['\n---\nCODEPILOT CODE INTELLIGENCE (VERIFIED FACTS):'];
  if (codeAnalysis.functions?.length > 0) {
    parts.push(`- Detected Functions: ${codeAnalysis.functions.map(f => `${f.name}(${(f.params || []).join(', ')})`).join(', ')}`);
  }
  if (codeAnalysis.loops?.length > 0) {
    parts.push(`- Loops: ${codeAnalysis.loops.length} loop(s) detected (Maximum nesting depth: ${codeAnalysis.maxLoopNesting})`);
  } else {
    parts.push('- Loops: 0 loops detected (linear control flow)');
  }
  if (codeAnalysis.dataStructures?.length > 0) {
    parts.push(`- Data Structures: ${codeAnalysis.dataStructures.map(d => `${d.type} (${d.name})`).join(', ')}`);
  }
  if (codeAnalysis.recursion) {
    parts.push(`- Recursion: ${codeAnalysis.recursion.detected ? `Yes (${codeAnalysis.recursion.recursiveFunctions.join(', ')})` : 'None'}`);
  }
  if (codeAnalysis.complexity) {
    parts.push(`- CodePilot Derived Complexity: Time: ${codeAnalysis.complexity.time} (${codeAnalysis.complexity.confidence}), Space: ${codeAnalysis.complexity.space}`);
    parts.push(`- Complexity Derivation: ${codeAnalysis.complexity.reasoning}`);
  }
  parts.push('IMPORTANT: Ensure your teaching and explanation aligns directly with these verified architectural facts.');
  return parts.join('\n');
}

/**
 * Builds the system prompt for the initial code analysis request.
 * @param {string} language - Programming language selected by user
 * @param {string} mode - Learning mode selected by user
 * @param {object} [codeAnalysis] - Verified CodePilot code analysis
 * @returns {string} Full system prompt
 */
export function buildAnalysisSystemPrompt(language, mode, codeAnalysis = null) {
  const modeInstruction = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.mentor;
  const analysisContext = formatCodeAnalysisContext(codeAnalysis);

  return `${BASE_INSTRUCTIONS}

---

${modeInstruction}

---

LANGUAGE CONTEXT:
The user is working with ${language} code. Use ${language}-appropriate terminology and examples when relevant.
${analysisContext}

---

ANALYSIS TASK:
The user has submitted code for analysis. Provide a structured explanation with these sections:

## Overview
What does this code do? (1-3 sentences, mode-appropriate)

## Step-by-Step Explanation
Walk through how the code executes, step by step.

## Important Concepts
What programming concepts or data structures are central to this code?

## Complexity
Time complexity and space complexity with reasoning (align with CodePilot's analysis).

## Edge Cases
What inputs or situations could cause unexpected behavior, bugs, or incorrect results?

## Key Lines
Which specific lines or sections deserve particular attention, and why?

Tailor the depth, tone, and vocabulary of ALL sections to the selected learning mode above.
Always reference the user's actual code. Do not give generic textbook explanations.`;
}

/**
 * Builds the user message for the initial analysis request.
 * @param {string} code - The submitted code
 * @param {string} language - Programming language
 * @returns {string}
 */
export function buildAnalysisUserMessage(code, language) {
  return `Please analyze this ${language} code:\n\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``;
}

/**
 * Builds the system prompt for follow-up chat messages.
 * @param {string} language - Programming language
 * @param {string} mode - Learning mode
 * @param {string} code - Original submitted code
 * @param {object} [codeAnalysis] - Verified CodePilot code analysis
 * @returns {string}
 */
export function buildChatSystemPrompt(language, mode, code, codeAnalysis = null) {
  const modeInstruction = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.mentor;
  const analysisContext = formatCodeAnalysisContext(codeAnalysis);

  return `${BASE_INSTRUCTIONS}

---

${modeInstruction}

---

LANGUAGE CONTEXT:
The user is working with ${language} code.
${analysisContext}

---

CODE CONTEXT:
The user submitted the following ${language} code at the start of this session. All follow-up questions refer to this code unless the user explicitly says otherwise:

\`\`\`${language.toLowerCase()}
${code}
\`\`\`

FOLLOW-UP BEHAVIOR:
- The user is having an open-ended conversation about this code.
- Answer any question the user asks — there are no restricted question types.
- Always relate your answer back to the specific submitted code above.
- Maintain conversational context from the message history.
- If the user says "I don't understand", do NOT repeat the same explanation. Simplify further, use a different analogy, or provide a concrete example traced through the code.
- The user may ask about any aspect of the code: why something was done, what would happen if something changed, complexity, alternatives, debugging, optimization, or anything else.`;
}

export default {
  buildAnalysisSystemPrompt,
  buildAnalysisUserMessage,
  buildChatSystemPrompt
};
