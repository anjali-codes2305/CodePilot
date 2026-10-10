import { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import type { NormalizedCodeAnalysis, StructuredSections } from '../types';

interface AnalysisPanelProps {
  analysis: string | null;
  structuredSections?: StructuredSections;
  codeAnalysis?: NormalizedCodeAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onSelectLine?: (line: number) => void;
  onNavigateTab?: (tab: 'visualize' | 'trace' | 'chat' | 'practice' | 'interview') => void;
}

/**
 * Displays the structured CodePilot analysis (Sections 13 & 14):
 * - Dedicated UI cards for Overview, Concepts, Step-by-Step, Key Lines, Edge Cases
 * - Quick action launch pad for Visualize, Trace, Practice, Interview, Chat
 * - Optional toggle to raw Markdown
 */
export default function AnalysisPanel({
  analysis,
  structuredSections,
  codeAnalysis,
  isLoading,
  error,
  onSelectLine,
  onNavigateTab
}: AnalysisPanelProps) {
  const [copied, setCopied] = useState(false);
  const [viewFormat, setViewFormat] = useState<'structured' | 'markdown'>('structured');

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-56 gap-4 bg-gray-900/30 border border-gray-800 rounded-xl p-6">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-lg">🧠</span>
        </div>
        <div className="text-center">
          <p className="text-gray-200 text-sm font-semibold">Understanding your code...</p>
          <p className="text-gray-500 text-xs mt-1">Analyzing syntax, logic, complexity & edge cases</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-950/30 border border-red-800/80 p-4 text-sm text-red-300">
        <div className="flex items-center gap-2 font-semibold text-red-200 mb-1">
          <span>⚠️</span>
          <span>Analysis Issue</span>
        </div>
        <p className="text-xs text-red-300/90 leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4 bg-gray-900/20 border border-gray-800/60 rounded-xl">
        <span className="text-3xl">🧑‍🏫</span>
        <p className="text-gray-300 text-sm">
          Paste your code on the left, choose a learning mode, and click{' '}
          <span className="text-cyan-400 font-semibold">Analyze Code</span>.
        </p>
        <p className="text-gray-500 text-xs">
          CodePilot will parse the structure, derive complexity, and generate an interactive learning session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* CodePilot Verified Intelligence Overview Cards */}
      {codeAnalysis && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-gray-900 border border-cyan-800/50 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span>
              <span>CodePilot Deterministic Intelligence</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
              AST Verified
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-gray-900/80 border border-gray-800 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-gray-500">Time Complexity</span>
              <span className="text-sm font-bold text-cyan-300 font-mono">
                {codeAnalysis.complexity?.time || 'O(n)'}
              </span>
              <span className="text-[9px] text-gray-400 capitalize">
                {codeAnalysis.complexity?.confidence}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-gray-900/80 border border-gray-800 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-gray-500">Space Complexity</span>
              <span className="text-sm font-bold text-purple-300 font-mono">
                {codeAnalysis.complexity?.space || 'O(1)'}
              </span>
              <span className="text-[9px] text-gray-400">Auxiliary Memory</span>
            </div>

            <div className="p-2 rounded-lg bg-gray-900/80 border border-gray-800 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-gray-500">Loops / Nesting</span>
              <span className="text-sm font-bold text-amber-300 font-mono">
                {codeAnalysis.loops.length} loop{codeAnalysis.loops.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[9px] text-gray-400">Max Depth: {codeAnalysis.maxLoopNesting}</span>
            </div>

            <div className="p-2 rounded-lg bg-gray-900/80 border border-gray-800 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-gray-500">Structures</span>
              <span className="text-sm font-bold text-emerald-300 font-mono truncate">
                {codeAnalysis.dataStructures.length > 0
                  ? codeAnalysis.dataStructures.map(d => d.type).join(', ')
                  : 'Primitives Only'}
              </span>
              <span className="text-[9px] text-gray-400">
                {codeAnalysis.recursion.detected ? 'Recursion Active' : 'Non-recursive'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Format View Toggle & Copy Actions */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <div className="flex items-center gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-800">
          <button
            onClick={() => setViewFormat('structured')}
            className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewFormat === 'structured'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Structured Cards
          </button>
          <button
            onClick={() => setViewFormat('markdown')}
            className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              viewFormat === 'markdown'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Raw Markdown
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="text-[11px] text-gray-400 hover:text-cyan-300 transition-colors flex items-center gap-1 px-2.5 py-1 rounded bg-gray-900 border border-gray-800 cursor-pointer"
        >
          {copied ? '✓ Copied' : '📋 Copy Analysis'}
        </button>
      </div>

      {/* VIEW 1: STRUCTURED CARDS (Section 13 & 14) */}
      {viewFormat === 'structured' && structuredSections ? (
        <div className="flex flex-col gap-4">
          {/* 1. Overview Card */}
          {structuredSections.overview && (
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📖</span>
                <span>Overview</span>
              </span>
              <p className="text-sm text-gray-200 leading-relaxed">
                {structuredSections.overview}
              </p>
            </div>
          )}

          {/* 2. Key Programming Concepts */}
          {structuredSections.concepts.length > 0 && (
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>💡</span>
                <span>Core Concepts & Data Structures</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {structuredSections.concepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-200 font-medium"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 3. Step-by-Step Execution Walkthrough */}
          {structuredSections.howItWorks.length > 0 && (
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col gap-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🪜</span>
                <span>How It Works (Step-by-Step)</span>
              </span>
              <div className="flex flex-col gap-2">
                {structuredSections.howItWorks.map((step, idx) => (
                  <div key={idx} className="flex gap-2.5 p-2.5 rounded-lg bg-gray-950/70 border border-gray-800 text-xs">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center justify-center font-bold font-mono shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-gray-300 leading-relaxed self-center">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Key Lines */}
          {structuredSections.importantLines.length > 0 && (
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📍</span>
                <span>Important Lines to Focus On</span>
              </span>
              <div className="flex flex-col gap-1.5">
                {structuredSections.importantLines.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => item.line && onSelectLine && onSelectLine(item.line)}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-950/60 border border-gray-800 hover:border-cyan-600 transition-colors cursor-pointer text-xs"
                  >
                    <span className="text-gray-300">{item.text}</span>
                    {item.line && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                        Jump to Line {item.line} →
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Edge Cases & Common Pitfalls */}
          {(structuredSections.edgeCases.length > 0 || structuredSections.commonMistakes.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {structuredSections.edgeCases.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 flex flex-col gap-2">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Edge Cases</span>
                  </span>
                  <div className="flex flex-col gap-1.5 text-xs text-amber-200/90">
                    {structuredSections.edgeCases.map((ec, idx) => (
                      <div key={idx} className="flex gap-1.5 items-start">
                        <span>•</span>
                        <span>{ec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {structuredSections.commonMistakes.length > 0 && (
                <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-800/40 flex flex-col gap-2">
                  <span className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🚫</span>
                    <span>Common Pitfalls</span>
                  </span>
                  <div className="flex flex-col gap-1.5 text-xs text-red-200/90">
                    {structuredSections.commonMistakes.map((cm, idx) => (
                      <div key={idx} className="flex gap-1.5 items-start">
                        <span>•</span>
                        <span>{cm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Learning Workflow Launch Pad (Section 14) */}
          {onNavigateTab && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 via-indigo-950/30 to-purple-950/30 border border-cyan-800/40 flex flex-col gap-3">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🚀</span>
                <span>Continue Your Learning Journey</span>
              </span>
              <p className="text-xs text-gray-400">
                Dive deeper into your code using CodePilot's specialized interactive tools:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onNavigateTab('visualize')}
                  className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-cyan-950 border border-cyan-800/80 text-cyan-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>🔀</span>
                  <span>Visualize Flowchart</span>
                </button>
                <button
                  onClick={() => onNavigateTab('trace')}
                  className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-indigo-950 border border-indigo-800/80 text-indigo-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>⏱️</span>
                  <span>Trace Execution</span>
                </button>
                <button
                  onClick={() => onNavigateTab('chat')}
                  className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-blue-950 border border-blue-800/80 text-blue-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>💬</span>
                  <span>Ask CodePilot</span>
                </button>
                <button
                  onClick={() => onNavigateTab('practice')}
                  className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-emerald-950 border border-emerald-800/80 text-emerald-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>📝</span>
                  <span>Practice Quiz</span>
                </button>
                <button
                  onClick={() => onNavigateTab('interview')}
                  className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-amber-950 border border-amber-800/80 text-amber-300 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>🎯</span>
                  <span>Interview Defense</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: RAW MARKDOWN VIEW */
        <div className="overflow-y-auto bg-gray-900/30 border border-gray-800/80 rounded-xl p-4">
          <MarkdownRenderer content={analysis} />
        </div>
      )}
    </div>
  );
}
