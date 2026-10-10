import { useState } from 'react';
import type { PracticeQuizItem } from '../types';

interface PracticeViewProps {
  quiz?: PracticeQuizItem[];
  onScoreUpdate?: (correct: number, total: number) => void;
}

/**
 * Practice & Verify Mode (Sections 28 & 29):
 * - Multiple-choice code comprehension questions
 * - Interactive answer evaluation with educational feedback
 */
export default function PracticeView({ quiz = [], onScoreUpdate }: PracticeViewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [userExplanations, setUserExplanations] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});

  if (!quiz || quiz.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-900/30 rounded-xl border border-gray-800 text-center">
        <span className="text-3xl mb-2">📝</span>
        <p className="text-gray-200 text-sm font-semibold">No Practice Questions Ready</p>
        <p className="text-gray-500 text-xs mt-1">Analyze code first to generate tailored practice questions.</p>
      </div>
    );
  }

  const handleSelectOption = (qId: string, option: string) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleCheckAnswer = (qId: string) => {
    setShowResults(prev => {
      const updated = { ...prev, [qId]: true };
      // Calculate score if multiple-choice
      if (onScoreUpdate) {
        const mcItems = quiz.filter(q => q.type === 'multiple_choice');
        const correctCount = mcItems.filter(q => selectedAnswers[q.id] === q.answer).length;
        onScoreUpdate(correctCount, mcItems.length);
      }
      return updated;
    });
  };

  const toggleHint = (qId: string) => {
    setRevealedHints(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Targeted Practice & Verify Mode
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400">
            {quiz.length} Challenges Grounded in Your Code
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {quiz.map((item, idx) => {
          const selected = selectedAnswers[item.id];
          const userExp = userExplanations[item.id] || '';
          const isSubmitted = showResults[item.id];
          const isCorrect = selected === item.answer;

          return (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400">
                  Challenge {idx + 1}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                  {item.type === 'multiple_choice' ? 'Multiple Choice' : 'Verify Mode (Conceptual)'}
                </span>
              </div>

              <p className="text-sm font-semibold text-gray-100 leading-relaxed">
                {item.prompt}
              </p>

              {/* 1. Multiple Choice Questions */}
              {item.type === 'multiple_choice' && item.options && (
                <div className="flex flex-col gap-2 mt-1">
                  {item.options.map((opt, optIdx) => {
                    const isOptionSelected = selected === opt;
                    let optStyle = 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-600';

                    if (isSubmitted) {
                      if (opt === item.answer) {
                        optStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold';
                      } else if (isOptionSelected && !isCorrect) {
                        optStyle = 'bg-red-950/80 border-red-500 text-red-200';
                      }
                    } else if (isOptionSelected) {
                      optStyle = 'bg-cyan-950/80 border-cyan-500 text-cyan-200';
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => !isSubmitted && handleSelectOption(item.id, opt)}
                        disabled={isSubmitted}
                        className={`text-left text-xs p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${optStyle}`}
                      >
                        <span>{opt}</span>
                        {isSubmitted && opt === item.answer && <span className="font-bold">✓ Correct</span>}
                        {isSubmitted && isOptionSelected && !isCorrect && <span className="font-bold">✗ Incorrect</span>}
                      </button>
                    );
                  })}

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
                    {!isSubmitted ? (
                      <button
                        onClick={() => handleCheckAnswer(item.id)}
                        disabled={!selected}
                        className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <div className="w-full p-3 rounded-lg bg-gray-950/80 border border-gray-800 text-xs">
                        <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isCorrect ? '🎉 Concept Understood!' : '💡 Educational Feedback:'}
                        </span>{' '}
                        <span className="text-gray-300">{item.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Conceptual Questions — Interactive Verify Mode (Section 29) */}
              {item.type === 'conceptual' && (
                <div className="flex flex-col gap-2.5 mt-1">
                  <div className="flex items-center gap-2">
                    {item.hint && (
                      <button
                        onClick={() => toggleHint(item.id)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        {revealedHints[item.id] ? 'Hide Hint' : '💡 Show Hint'}
                      </button>
                    )}
                  </div>

                  {revealedHints[item.id] && item.hint && (
                    <p className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/50 p-2.5 rounded-lg">
                      {item.hint}
                    </p>
                  )}

                  {!isSubmitted ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] text-gray-400">
                        Type your reasoning below to test your understanding:
                      </label>
                      <textarea
                        rows={2}
                        value={userExp}
                        onChange={e => setUserExplanations(prev => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="State what happens or how you would approach this..."
                        className="p-2.5 rounded-lg bg-gray-950 border border-gray-700 text-gray-200 text-xs resize-none outline-none focus:border-cyan-500 transition-colors"
                      />
                      <button
                        onClick={() => handleCheckAnswer(item.id)}
                        className="self-start px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Verify My Answer
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-gray-950 border border-gray-800 text-xs flex flex-col gap-2">
                      {userExp.trim() && (
                        <div className="p-2 rounded bg-gray-900 border border-gray-800 text-gray-400">
                          <strong className="text-gray-300">Your Answer:</strong> {userExp}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-emerald-400">Educational Review & Core Concept:</span>
                        <p className="text-gray-200 mt-1 leading-relaxed">
                          {item.expectedConcept}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
