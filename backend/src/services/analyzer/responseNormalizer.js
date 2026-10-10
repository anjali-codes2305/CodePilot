/**
 * CodePilot Structured AI Response Normalizer (Section 13 & 14)
 * 
 * Normalizes Gemini teaching output into dedicated structured sections:
 * - overview
 * - howItWorks
 * - concepts
 * - complexity
 * - importantLines
 * - edgeCases
 * - commonMistakes
 * - suggestedQuestions
 */

export function normalizeAnalysisResponse(rawMarkdown, codeAnalysis) {
  if (!rawMarkdown || typeof rawMarkdown !== 'string') {
    return createFallbackStructure(codeAnalysis);
  }

  const sections = {
    overview: '',
    howItWorks: [],
    concepts: [],
    complexity: {
      time: codeAnalysis?.complexity?.time || 'O(n)',
      space: codeAnalysis?.complexity?.space || 'O(1)',
      reasoning: codeAnalysis?.complexity?.reasoning || ''
    },
    importantLines: [],
    edgeCases: [],
    commonMistakes: [],
    suggestedQuestions: []
  };

  // Split into markdown headers (## or ###)
  const headerBlocks = rawMarkdown.split(/\n(?=##+\s+)/);

  for (const block of headerBlocks) {
    const trimmed = block.trim();
    const firstLineEnd = trimmed.indexOf('\n');
    const headerLine = firstLineEnd === -1 ? trimmed : trimmed.slice(0, firstLineEnd);
    const content = firstLineEnd === -1 ? '' : trimmed.slice(firstLineEnd).trim();
    const cleanHeader = headerLine.replace(/^#+\s*/, '').toLowerCase();

    if (cleanHeader.includes('overview') || cleanHeader.includes('summary')) {
      sections.overview = content;
    } else if (cleanHeader.includes('step-by-step') || cleanHeader.includes('how it works') || cleanHeader.includes('execution')) {
      // Split list items or numbered items
      const items = content.split(/\n(?=\d+\.|\-|\*)/).map(s => s.replace(/^\d+\.\s*|^[\-\*]\s*/, '').trim()).filter(Boolean);
      sections.howItWorks = items.length > 0 ? items : [content];
    } else if (cleanHeader.includes('concept') || cleanHeader.includes('data structure')) {
      const items = content.split(/\n(?=[\-\*]|\d+\.)/).map(s => s.replace(/^[\-\*]\s*|^\d+\.\s*/, '').trim()).filter(Boolean);
      sections.concepts = items.length > 0 ? items : [content];
    } else if (cleanHeader.includes('edge case')) {
      const items = content.split(/\n(?=[\-\*]|\d+\.)/).map(s => s.replace(/^[\-\*]\s*|^\d+\.\s*/, '').trim()).filter(Boolean);
      sections.edgeCases = items.length > 0 ? items : [content];
    } else if (cleanHeader.includes('line') || cleanHeader.includes('key lines') || cleanHeader.includes('important lines')) {
      const items = content.split(/\n(?=[\-\*]|\d+\.)/).map(s => s.replace(/^[\-\*]\s*|^\d+\.\s*/, '').trim()).filter(Boolean);
      sections.importantLines = items.map(item => {
        const lineMatch = item.match(/line\s*(\d+)/i);
        return {
          line: lineMatch ? parseInt(lineMatch[1], 10) : null,
          text: item
        };
      });
    } else if (cleanHeader.includes('mistake') || cleanHeader.includes('pitfall')) {
      const items = content.split(/\n(?=[\-\*]|\d+\.)/).map(s => s.replace(/^[\-\*]\s*|^\d+\.\s*/, '').trim()).filter(Boolean);
      sections.commonMistakes = items.length > 0 ? items : [content];
    }
  }

  // Populate fallbacks from codeAnalysis if missing
  if (!sections.overview) {
    sections.overview = rawMarkdown.slice(0, 300).replace(/#+\s*[^\n]+\n/g, '').trim();
  }

  if (sections.concepts.length === 0 && codeAnalysis?.dataStructures) {
    sections.concepts = codeAnalysis.dataStructures.map(ds => `${ds.type}: allocated on line ${ds.line}`);
  }

  if (sections.importantLines.length === 0 && codeAnalysis?.functions) {
    sections.importantLines = codeAnalysis.functions.map(fn => ({
      line: fn.line,
      text: `Function ${fn.name}() entry point on line ${fn.line}`
    }));
  }

  // Standard suggested questions for the code
  sections.suggestedQuestions = [
    'How does this algorithm handle empty or null inputs?',
    `Why is the time complexity ${sections.complexity.time}?`,
    'Can we optimize the space complexity?',
    'Trace this code with an example input'
  ];

  return sections;
}

function createFallbackStructure(codeAnalysis) {
  return {
    overview: 'Code submitted for analysis.',
    howItWorks: ['Code executes linearly through functions and loops.'],
    concepts: (codeAnalysis?.dataStructures || []).map(d => d.type),
    complexity: codeAnalysis?.complexity || { time: 'O(n)', space: 'O(1)' },
    importantLines: [],
    edgeCases: ['Null or empty input collections'],
    commonMistakes: ['Off-by-one errors in loop boundaries'],
    suggestedQuestions: ['What is the time complexity?', 'Why did you use this approach?']
  };
}

export default { normalizeAnalysisResponse };
