/**
 * Practice & Interview Generation Service
 * 
 * Generates tailored practice challenges and interview prompts
 * directly grounded in the user's analyzed code and concepts (Sections 28, 29, 30).
 */

export function generatePracticeQuiz(codeAnalysis, code) {
  const quiz = [];
  const dsNames = (codeAnalysis.dataStructures || []).map(d => d.type);
  const timeComplexity = codeAnalysis.complexity?.time || 'O(n)';

  // Question 1: Complexity check
  quiz.push({
    id: 'q_complexity',
    type: 'multiple_choice',
    prompt: `What is the worst-case time complexity of this code?`,
    options: [
      timeComplexity,
      timeComplexity === 'O(n)' ? 'O(n²)' : 'O(n)',
      'O(log n)',
      'O(1)'
    ].sort(() => Math.random() - 0.5),
    answer: timeComplexity,
    explanation: `Because: ${codeAnalysis.complexity?.reasoning || 'Derived from the detected loop nesting and access patterns.'}`
  });

  // Question 2: Data structure purpose (if data structures detected)
  if (dsNames.includes('HashSet')) {
    quiz.push({
      id: 'q_ds_hashset',
      type: 'multiple_choice',
      prompt: `Why is a HashSet used instead of an Array/ArrayList for duplicate checking?`,
      options: [
        'HashSet provides O(1) average lookup time via hashing, whereas an Array requires O(n) scan.',
        'HashSet automatically sorts elements in ascending order.',
        'HashSet requires zero memory overhead.',
        'HashSet allows duplicate elements to be stored without collisions.'
      ],
      answer: 'HashSet provides O(1) average lookup time via hashing, whereas an Array requires O(n) scan.',
      explanation: 'Checking membership with set.contains() operates in O(1) expected time, allowing single-pass O(n) overall complexity.'
    });
  } else if (codeAnalysis.loops.length > 0) {
    quiz.push({
      id: 'q_loop_behavior',
      type: 'multiple_choice',
      prompt: `What determines how many times the main loop executes in the worst case?`,
      options: [
        'The length of the input data structure or collection.',
        'A fixed constant number of 100 iterations.',
        'The memory capacity of the CPU cache.',
        'The number of variables declared in the function.'
      ],
      answer: 'The length of the input data structure or collection.',
      explanation: 'The loop traverses elements up to the size of the input array or until a return condition is met.'
    });
  }

  // Question 3: Edge Case Challenge
  quiz.push({
    id: 'q_edge_case',
    type: 'conceptual',
    prompt: `What happens if the input has no duplicates or is empty?`,
    expectedConcept: 'Returns default value (-1 or null/empty) after complete traversal.',
    hint: 'Look at the return statement outside the main loop.'
  });

  // Question 4: Optimization / Trade-off
  quiz.push({
    id: 'q_tradeoff',
    type: 'conceptual',
    prompt: `How could you reduce the auxiliary space complexity from O(n) to O(1)?`,
    expectedConcept: 'Sorting first in-place (O(n log n) time, O(1) space) or Floyd\'s cycle detection if values are bounded.',
    hint: 'Think about modifying the array in-place or sorting.'
  });

  return quiz;
}

export function generateInterviewQuestions(codeAnalysis, code) {
  return [
    {
      id: 'int_1',
      round: 'Complexity Defense',
      question: `Interviewer: "Walk me through the time and space complexity of your solution. How did you arrive at ${codeAnalysis.complexity?.time || 'your estimate'}?"`,
      evaluationCriteria: [
        'Explicitly mentions loop iterations proportional to input length n',
        'Explains auxiliary data structure memory overhead',
        'Distinguishes between best case and worst case'
      ]
    },
    {
      id: 'int_2',
      round: 'Edge Case Exploration',
      question: `Interviewer: "What edge cases did you consider? What happens if the input array is null, empty, or contains negative numbers?"`,
      evaluationCriteria: [
        'Null check validation',
        'Array of length 0 or 1',
        'Duplicate at the very beginning vs duplicate at the very end'
      ]
    },
    {
      id: 'int_3',
      round: 'Design Trade-offs',
      question: `Interviewer: "If memory was severely restricted and you could NOT allocate extra space, how would your algorithm change?"`,
      evaluationCriteria: [
        'Trade-off between time and space',
        'In-place sorting vs nested loops',
        'Understanding cycle detection algorithms (Floyd\'s Tortoise and Hare)'
      ]
    }
  ];
}

export default { generatePracticeQuiz, generateInterviewQuestions };
