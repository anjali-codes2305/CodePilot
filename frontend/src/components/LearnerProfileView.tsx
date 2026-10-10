import type { LearnerProfile, LearningMode } from '../types';

interface LearnerProfileViewProps {
  profile: LearnerProfile;
  currentMode: LearningMode;
  isOpen: boolean;
  onClose: () => void;
}

export default function LearnerProfileView({
  profile,
  currentMode,
  isOpen,
  onClose
}: LearnerProfileViewProps) {
  if (!isOpen) return null;

  const totalQuizzes = profile.practiceScore.total;
  const scorePercent = totalQuizzes > 0
    ? Math.round((profile.practiceScore.correct / totalQuizzes) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#090d16] border border-gray-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0b101c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-base">
              🎓
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Learner Profile & Session State</h3>
              <p className="text-[11px] text-gray-400">Continuous programming mastery tracking (Section 31)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-center">
              <span className="text-[10px] uppercase font-mono text-gray-500 block">Questions Asked</span>
              <span className="text-xl font-extrabold text-cyan-300 font-mono">
                {profile.questionsAskedCount}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-center">
              <span className="text-[10px] uppercase font-mono text-gray-500 block">Quiz Accuracy</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {totalQuizzes > 0 ? `${scorePercent}%` : 'N/A'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-center">
              <span className="text-[10px] uppercase font-mono text-gray-500 block">Active Mode</span>
              <span className="text-base font-bold text-amber-300 capitalize">
                {currentMode}
              </span>
            </div>
          </div>

          {/* Concepts Encountered */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🧠</span>
              <span>Concepts Encountered in This Session</span>
            </span>
            {profile.conceptsEncountered.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Analyze code to start tracking concepts.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.conceptsEncountered.map((c, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Concepts Mastered */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏆</span>
              <span>Concepts Understood & Verified</span>
            </span>
            {profile.conceptsMastered.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Complete practice quizzes to earn concept verification badges.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.conceptsMastered.map((c, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <span>✓</span>
                    <span>{c}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Adaptive Learning Insights */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/30 border border-cyan-800/40">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">🎯</span>
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Personalized Recommendation
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {profile.confusionPoints.length > 0 ? (
                <>Focus practice on: <strong className="text-amber-300">{profile.confusionPoints.join(', ')}</strong>. Try stepping through execution trace or asking for simpler analogies.</>
              ) : (
                <>You have strong foundational understanding of the current code structure. Advance to <strong>Interview Defense</strong> mode to test edge cases!</>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800 bg-[#070a12] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
