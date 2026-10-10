/**
 * Optimized Smart Question Router
 * 
 * Intercepts structural, factual questions and delivers instant, 100% accurate
 * answers directly from CodePilot's AST analysis (0 LLM tokens, <1ms latency).
 * Yields pedagogical, reasoning, and conceptual queries to Gemini with ground-truth facts.
 */

export function routeQuestion(question, codeAnalysis) {
  if (!question || !codeAnalysis) {
    return { shouldCallGemini: true };
  }

  const q = question.toLowerCase().trim();

  // 1. Natural Language Reasoning & Teaching — MUST ROUTE TO GEMINI
  const reasoningKeywords = [
    'why', 'how come', 'explain', 'analogy', 'beginner', 'interview me',
    'optimize', 'alternative', 'improve', 'walkthrough', 'trace this', 
    'test case', 'what if', 'difference between', 'recommend'
  ];

  if (reasoningKeywords.some(keyword => q.includes(keyword))) {
    return { shouldCallGemini: true };
  }

  // 2. Loop Count & Nesting Depth
  if (
    /(how many|count of|number of|any|list|show)\s+(loops?|iterations?)/i.test(q) ||
    /^(loops?|loop count|loop depth)$/i.test(q)
  ) {
    const loops = codeAnalysis.loops || [];
    if (loops.length === 0) {
      return {
        shouldCallGemini: false,
        source: 'codepilot',
        deterministic: true,
        tokensSaved: 480,
        response: `**CodePilot AST Intelligence:**\n\nThere are **0 loops** in this code. The execution path flows sequentially with constant-time control transitions.`
      };
    }

    const loopDetails = loops.map((l, i) => 
      `- Loop ${i + 1}: **${l.type} loop** on line ${l.line} (depth: ${l.depth}, step: \`${l.stepType || 'increment'}\`)${l.condition ? ` with condition \`${l.condition}\`` : ''}`
    ).join('\n');

    return {
      shouldCallGemini: false,
      source: 'codepilot',
      deterministic: true,
      tokensSaved: 480,
      response: `**CodePilot AST Intelligence:**\n\nDetected **${loops.length} loop${loops.length > 1 ? 's' : ''}** (Maximum Nesting Depth: **${codeAnalysis.maxLoopNesting}**):\n\n${loopDetails}\n\n*Answered deterministically from parsed AST (0 LLM tokens).*`
    };
  }

  // 3. Factual Time Complexity
  if (
    /(what is|show|tell me|get)?\s*(the)?\s*time complexity/i.test(q) ||
    q === 'time complexity'
  ) {
    const comp = codeAnalysis.complexity;
    return {
      shouldCallGemini: false,
      source: 'codepilot',
      deterministic: true,
      tokensSaved: 520,
      response: `**CodePilot Complexity Engine:**\n\n- **Time Complexity:** \`${comp.time}\` (${comp.confidence})\n\n**Derivation:** ${comp.reasoning}\n\n*To learn why this complexity occurs, ask: "Why is the time complexity ${comp.time}?"*`
    };
  }

  // 4. Factual Space Complexity
  if (
    /(what is|show|tell me|get)?\s*(the)?\s*(space complexity|auxiliary space|memory complexity)/i.test(q) ||
    q === 'space complexity'
  ) {
    const comp = codeAnalysis.complexity;
    return {
      shouldCallGemini: false,
      source: 'codepilot',
      deterministic: true,
      tokensSaved: 520,
      response: `**CodePilot Complexity Engine:**\n\n- **Auxiliary Space Complexity:** \`${comp.space}\` (${comp.confidence})\n\n**Derivation:** ${comp.reasoning}\n\n*To understand the memory allocation in detail, ask: "Explain the space complexity."*`
    };
  }

  // 5. General Complexity Overview
  if (
    q === 'complexity' || 
    /(what is|show|tell me|get)?\s*(the)?\s*complexity\??$/i.test(q)
  ) {
    const comp = codeAnalysis.complexity;
    return {
      shouldCallGemini: false,
      source: 'codepilot',
      deterministic: true,
      tokensSaved: 550,
      response: `**CodePilot Complexity Engine:**\n\n- **Time Complexity:** \`${comp.time}\` (${comp.confidence})\n- **Space Complexity:** \`${comp.space}\`\n\n**Derivation:** ${comp.reasoning}\n\n*Ask "Why is it ${comp.time}?" for a conceptual deep-dive.*`
    };
  }

  // 6. Functions / Signatures
  if (
    /(what|which|list|show)\s+(functions?|methods?|signatures?)/i.test(q) ||
    /^(functions?|methods?)$/i.test(q)
  ) {
    const fns = codeAnalysis.functions || [];
    if (fns.length === 0) {
      return {
        shouldCallGemini: false,
        source: 'codepilot',
        deterministic: true,
        tokensSaved: 460,
        response: `**CodePilot AST Intelligence:**\n\nNo explicitly declared named functions found (snippet executes in global/script scope).`
      };
    }

    const list = fns.map(f => 
      `- \`${f.name}(${(f.params || []).join(', ')})\` — declared on line ${f.line}${f.returnType ? ` returning \`${f.returnType}\`` : ''}`
    ).join('\n');

    return {
      shouldCallGemini: false,
      source: 'codepilot',
      deterministic: true,
      tokensSaved: 460,
      response: `**CodePilot AST Intelligence:**\n\nDetected **${fns.length} function signature${fns.length > 1 ? 's' : ''}**:\n\n${list}\n\n*Extracted directly via AST structural parser.*`
    };
  }

  // 7. Recursion Check
  if (
    /(is there|does it use|has|any)\s+recursion/i.test(q) ||
    /is this (code )?recursive/i.test(q) ||
    q === 'recursion'
  ) {
    const rec = codeAnalysis.recursion;
    if (rec?.detected) {
      return {
        shouldCallGemini: false,
        source: 'codepilot',
        deterministic: true,
        tokensSaved: 450,
        response: `**CodePilot AST Intelligence:**\n\n**Yes, recursion is active!** The function${rec.recursiveFunctions.length > 1 ? 's' : ''} \`${rec.recursiveFunctions.join('`, `')}\` invokes itself recursively.`
      };
    } else {
      return {
        shouldCallGemini: false,
        source: 'codepilot',
        deterministic: true,
        tokensSaved: 450,
        response: `**CodePilot AST Intelligence:**\n\n**No recursion detected.** All function calls are non-recursive iterations or direct returns.`
      };
    }
  }

  // 8. Data Structures Used
  if (
    /(what|which|list|show)\s+(data structures?|collections?|memory structures?)/i.test(q) ||
    /data structures?( used)?/i.test(q)
  ) {
    const ds = codeAnalysis.dataStructures || [];
    if (ds.length === 0) {
      return {
        shouldCallGemini: false,
        source: 'codepilot',
        deterministic: true,
        tokensSaved: 470,
        response: `**CodePilot AST Intelligence:**\n\nNo dynamic heap collections (like HashSet, HashMap, Stack, Queue) were allocated. The algorithm operates strictly with primitive variables in O(1) space.`
      };
    }

    const list = ds.map(d => `- **${d.type}** (variable \`${d.name}\`) allocated on line ${d.line}`).join('\n');
    return {
      shouldCallGemini: false,
      source: 'codepilot',
      deterministic: true,
      tokensSaved: 470,
      response: `**CodePilot AST Intelligence:**\n\nDetected **${ds.length} data structure instance${ds.length > 1 ? 's' : ''}**:\n\n${list}\n\n*Extracted deterministically from allocation patterns.*`
    };
  }

  // 9. Lines of Code / Metrics
  if (/(how many|count of|number of)?\s*(lines of code|loc)\??$/i.test(q)) {
    return {
      shouldCallGemini: false,
      source: 'codepilot',
      deterministic: true,
      tokensSaved: 400,
      response: `**CodePilot AST Intelligence:**\n\nThis snippet contains **${codeAnalysis.loc} lines of executable code** (excluding empty lines).`
    };
  }

  // Default: Route to Gemini for conceptual, pedagogical, and open conversation
  return { shouldCallGemini: true };
}

export default { routeQuestion };
