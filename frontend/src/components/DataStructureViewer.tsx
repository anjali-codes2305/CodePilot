import type { NormalizedCodeAnalysis } from '../types';

interface DataStructureViewerProps {
  analysis?: NormalizedCodeAnalysis | null;
}

export default function DataStructureViewer({ analysis }: DataStructureViewerProps) {
  const structures = analysis?.dataStructures || [];

  if (structures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-900/30 rounded-xl border border-gray-800 text-center">
        <span className="text-3xl mb-2">📦</span>
        <p className="text-gray-200 text-sm font-semibold">No Auxiliary Structures Detected</p>
        <p className="text-gray-500 text-xs mt-1">This code operates entirely using primitive variables in constant O(1) space.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Detected Data Structures & Memory Layout
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
          {structures.length} Structure{structures.length > 1 ? 's' : ''} Identified
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {structures.map((ds, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 hover:border-gray-700 transition-all flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {ds.type === 'HashSet' ? '🏷️' : ds.type === 'HashMap' ? '🗂️' : ds.type === 'Stack' ? '📚' : '🔢'}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white font-mono">{ds.name}</h4>
                  <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">{ds.type}</span>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                Line {ds.line}
              </span>
            </div>

            {/* Visual representation */}
            {ds.type === 'HashSet' && (
              <div className="flex flex-col gap-2">
                <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-800/40">
                  <p className="text-xs text-purple-300 mb-2 font-medium">Hash Buckets (O(1) Avg Lookup):</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-purple-900/60 border border-purple-600 text-purple-200 text-xs font-mono">
                      item₁
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-purple-900/60 border border-purple-600 text-purple-200 text-xs font-mono">
                      item₂
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-purple-900/40 border border-purple-700/40 border-dashed text-purple-300/60 text-xs font-mono">
                      + dynamically added
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Enables rapid membership testing with <code className="text-cyan-400">.contains()</code> without linear scanning.
                </p>
              </div>
            )}

            {ds.type === 'Array' && (
              <div className="flex flex-col gap-2">
                <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-800/40">
                  <p className="text-xs text-blue-300 mb-2 font-medium">Contiguous Memory Array:</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded bg-blue-900/50 border border-blue-600 flex items-center justify-center font-mono text-xs text-blue-200 font-bold">
                          [{i}]
                        </div>
                        <span className="text-[9px] text-gray-500 font-mono mt-0.5">idx {i}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Indexed contiguous memory structure traversed sequentially or by random access.
                </p>
              </div>
            )}

            {ds.type !== 'HashSet' && ds.type !== 'Array' && (
              <div className="p-3 rounded-lg bg-gray-800/50 text-xs text-gray-300 font-mono">
                Instance of <span className="text-cyan-400">{ds.type}</span> initialized at line {ds.line}.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
