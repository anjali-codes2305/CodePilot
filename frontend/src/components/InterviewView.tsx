import { useState } from 'react';
import type { InterviewQuestion } from '../types';

interface InterviewViewProps {
  questions?: InterviewQuestion[];
  onAskChat?: (prompt: string) => void;
}

export default function InterviewView({ questions = [], onAskChat }: InterviewViewProps) {
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [evaluated, setEvaluated] = useState<Record<string, boolean>>({});

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-900/30 rounded-xl border border-gray-800 text-center">
        <span className="text-3xl mb-2">🎯</span>
        <p className="text-gray-200 text-sm font-semibold">No Interview Questions Ready</p>
        <p className="text-gray-500 text-xs mt-1">Analyze code first to launch mock technical interview defense.</p>
      </div>
    );
  }

  const currentQ = questions[activeQuestionIdx];
  const currentAnswer = userAnswers[currentQ?.id] || '';
  const isEvaluated = evaluated[currentQ?.id];

  const handleEvaluate = () => {
    if (!currentAnswer.trim()) return;
    setEvaluated(prev => ({ ...prev, [currentQ.id]: true }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Mock Technical Interview Defense
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400">
            Round {activeQuestionIdx + 1} of {questions.length}
          </span>
        </div>
      </div>

      {/* Round Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setActiveQuestionIdx(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeQuestionIdx === idx
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'
            }`}
          >
            Round {idx + 1}: {q.round}
          </button>
        ))}
      </div>

      {/* Active Question Box */}
      {currentQ && (
        <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 flex flex-col gap-3">
          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40">
            <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold block mb-1">
              {currentQ.round}
            </span>
            <p className="text-sm font-semibold text-white leading-relaxed">
              {currentQ.question}
            </p>
          </div>

          {/* User Answer Area */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 font-medium">Your Defense / Explanation:</label>
            <textarea
              rows={4}
              value={currentAnswer}
              onChange={e => setUserAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
              placeholder="Explain your approach, cite time/space complexity, or handle edge cases..."
              disabled={isEvaluated}
              className="p-3 rounded-lg bg-gray-950 border border-gray-700 text-gray-100 text-xs resize-none outline-none focus:border-cyan-500 transition-colors leading-relaxed"
            />

            {!isEvaluated ? (
              <button
                onClick={handleEvaluate}
                disabled={!currentAnswer.trim()}
                className="self-end px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer transition-colors shadow-md shadow-cyan-900/20"
              >
                Submit Answer for Evaluation
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 flex flex-col gap-3 mt-2">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>📋</span>
                    <span>Interviewer Evaluation Checklist</span>
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                    Assessment Complete
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {currentQ.evaluationCriteria.map((criterion, cIdx) => (
                    <div key={cIdx} className="flex items-center gap-2 text-xs text-gray-300">
                      <span className="text-emerald-400">✓</span>
                      <span>{criterion}</span>
                    </div>
                  ))}
                </div>

                {onAskChat && (
                  <button
                    onClick={() => onAskChat(`Evaluate this interview defense for ${currentQ.round}: "${currentAnswer}"`)}
                    className="self-start text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer mt-1"
                  >
                    💬 Ask CodePilot to critique this defense in the chat
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
