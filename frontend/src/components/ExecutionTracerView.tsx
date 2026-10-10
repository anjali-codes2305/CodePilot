import { useState, useEffect, useRef } from 'react';
import type { ExecutionTrace, ExecutionStep } from '../types';

interface ExecutionTracerViewProps {
  trace?: ExecutionTrace | null;
  onSelectLine?: (line: number) => void;
}

export default function ExecutionTracerView({ trace, onSelectLine }: ExecutionTracerViewProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1200); // ms per step
  const timerRef = useRef<number | null>(null);

  const steps = trace?.steps || [];
  const currentStep: ExecutionStep | undefined = steps[currentStepIdx];

  // Sync line highlight with editor
  useEffect(() => {
    if (currentStep?.line && onSelectLine) {
      onSelectLine(currentStep.line);
    }
  }, [currentStepIdx, currentStep, onSelectLine]);

  // Autoplay loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setCurrentStepIdx(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, steps.length]);

  if (!trace || !trace.supported || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-900/30 rounded-xl border border-gray-800 text-center">
        <span className="text-3xl mb-2">⏱️</span>
        <p className="text-gray-200 text-sm font-semibold">Execution Tracing Information</p>
        <p className="text-gray-400 text-xs mt-1 max-w-md leading-relaxed">
          {trace?.reason || 'Dynamic step-by-step tracing is currently supported for JavaScript and canonical algorithm patterns. Full static Control Flow Graph is active in the Visualize tab.'}
        </p>
      </div>
    );
  }

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1));
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIdx(prev => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIdx(0);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Playback Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors cursor-pointer"
            title="Reset to Step 1"
          >
            ⏮ Reset
          </button>
          <button
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-xs transition-colors cursor-pointer"
            title="Previous Step"
          >
            ◀ Back
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/30'
            }`}
          >
            <span>{isPlaying ? '⏸ Pause' : '▶ Play'}</span>
          </button>
          <button
            onClick={handleNext}
            disabled={currentStepIdx === steps.length - 1}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-xs transition-colors cursor-pointer"
            title="Next Step"
          >
            Next ▶
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Speed:</span>
          <select
            value={playbackSpeed}
            onChange={e => setPlaybackSpeed(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-gray-200 rounded px-2 py-1 text-xs outline-none cursor-pointer"
          >
            <option value={2000}>0.5x (Slow)</option>
            <option value={1200}>1.0x (Normal)</option>
            <option value={600}>2.0x (Fast)</option>
          </select>
        </div>

        {/* Step Indicator */}
        <div className="text-xs font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2.5 py-1 rounded-md">
          Step {currentStepIdx + 1} of {steps.length}
        </div>
      </div>

      {/* Scrubber slider */}
      <div className="flex items-center gap-3 px-1">
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={currentStepIdx}
          onChange={e => {
            setIsPlaying(false);
            setCurrentStepIdx(Number(e.target.value));
          }}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      {/* Current Step Highlight Card */}
      {currentStep && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-gray-900 border border-cyan-800/50 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>📍</span>
              <span>Executing Line {currentStep.line}</span>
            </span>
            {currentStep.isReturn && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900 border border-emerald-700 text-emerald-300 font-bold uppercase">
                Return Executed
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white leading-relaxed">
            {currentStep.description}
          </p>
        </div>
      )}

      {/* Live Variable & State Inspector */}
      {currentStep && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Variables Table */}
          <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span>📊</span>
              <span>Scalar Variables</span>
            </h4>
            {Object.keys(currentStep.variables || {}).length === 0 ? (
              <p className="text-xs text-gray-500 italic">No scalar variables modified this step</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {Object.entries(currentStep.variables).map(([name, val]) => (
                  <div key={name} className="flex items-center justify-between py-1 px-2 rounded bg-gray-800/60 font-mono text-xs">
                    <span className="text-amber-300 font-semibold">{name}:</span>
                    <span className="text-cyan-300 truncate max-w-[180px]">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data Structure / Memory Inspector */}
          <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span>📦</span>
              <span>Data Structure State</span>
            </h4>
            {Object.keys(currentStep.dataStructures || {}).length === 0 ? (
              <p className="text-xs text-gray-500 italic">No auxiliary structures</p>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(currentStep.dataStructures || {}).map(([name, val]) => (
                  <div key={name} className="flex flex-col gap-1 p-2 rounded bg-gray-800/60 text-xs">
                    <span className="text-xs font-semibold text-purple-300 capitalize">{name}:</span>
                    {Array.isArray(val) ? (
                      <div className="flex flex-wrap gap-1">
                        {val.length === 0 ? (
                          <span className="text-gray-500 italic text-[11px]">Empty Set / Collection</span>
                        ) : (
                          val.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-purple-900/70 border border-purple-700/60 text-purple-200 font-mono text-[11px]"
                            >
                              {String(item)}
                            </span>
                          ))
                        )}
                      </div>
                    ) : (
                      <span className="font-mono text-cyan-300">{JSON.stringify(val)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
