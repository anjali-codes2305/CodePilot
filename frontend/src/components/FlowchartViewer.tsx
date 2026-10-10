import { useState } from 'react';
import type { ControlFlowNode, ControlFlowEdge } from '../types';

interface FlowchartViewerProps {
  nodes: ControlFlowNode[];
  edges: ControlFlowEdge[];
  activeLine?: number | null;
  onSelectLine?: (line: number) => void;
}

export default function FlowchartViewer({
  nodes,
  edges,
  activeLine,
  onSelectLine
}: FlowchartViewerProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-900/40 rounded-xl border border-gray-800 text-center">
        <span className="text-3xl mb-2">🔀</span>
        <p className="text-gray-300 text-sm font-semibold">No Control Flow Graph Available</p>
        <p className="text-gray-500 text-xs mt-1">Analyze code first to generate the structural flow diagram.</p>
      </div>
    );
  }

  const getNodeBadgeColor = (type: string) => {
    switch (type) {
      case 'start':
        return 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300';
      case 'end':
        return 'bg-purple-950/80 border-purple-500/60 text-purple-300';
      case 'loop':
        return 'bg-blue-950/80 border-blue-500/70 text-blue-300';
      case 'condition':
        return 'bg-amber-950/80 border-amber-500/70 text-amber-300';
      case 'return':
        return 'bg-cyan-950/80 border-cyan-500/70 text-cyan-300';
      default:
        return 'bg-gray-900/80 border-gray-700 text-gray-300';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'start': return '🚀';
      case 'end': return '🏁';
      case 'loop': return '🔄';
      case 'condition': return '⚖️';
      case 'return': return '↩️';
      default: return '⚙️';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Deterministic Control Flow Graph
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono">
            {nodes.length} Nodes · {edges.length} Transitions
          </span>
        </div>
        <span className="text-[11px] text-gray-400">Click a node to jump to code line</span>
      </div>

      <div className="bg-[#07090e] border border-gray-800 rounded-xl p-4 overflow-y-auto max-h-[500px]">
        <div className="flex flex-col items-center gap-2 relative">
          {nodes.map((node, idx) => {
            const isLineActive = activeLine === node.line;
            const isSelected = selectedNodeId === node.id;

            return (
              <div key={node.id} className="flex flex-col items-center w-full max-w-md">
                {/* Node Box */}
                <div
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    if (node.line && onSelectLine) {
                      onSelectLine(node.line);
                    }
                  }}
                  className={`
                    w-full p-3 rounded-xl border transition-all cursor-pointer select-none
                    ${getNodeBadgeColor(node.type)}
                    ${isLineActive || isSelected ? 'ring-2 ring-cyan-400 scale-[1.02] shadow-lg shadow-cyan-950/50' : 'hover:scale-[1.01] hover:border-gray-600'}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      <span>{getNodeIcon(node.type)}</span>
                      <span className="uppercase tracking-wider font-mono text-[10px] opacity-80">{node.type}</span>
                    </span>
                    {node.line && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-cyan-300">
                        Line {node.line}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-gray-100 font-mono truncate">
                    {node.label}
                  </p>

                  {node.detail && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      {node.detail}
                    </p>
                  )}
                </div>

                {/* Connecting arrow if not the last node */}
                {idx < nodes.length - 1 && (
                  <div className="flex flex-col items-center my-0.5 text-gray-600">
                    <div className="w-0.5 h-3 bg-gray-700" />
                    <span className="text-xs leading-none -mt-1 text-gray-500">▼</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
