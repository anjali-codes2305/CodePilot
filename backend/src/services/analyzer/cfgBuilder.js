/**
 * Optimized Control Flow Graph (CFG) Builder
 * 
 * Generates an expressive directed graph:
 * - Decision conditions with True / False branches.
 * - Loops with Iteration and Exit branches.
 * - Maps every node directly to source line numbers.
 */

export function buildControlFlowGraph({ functions, loops, conditionals, operations, loc }) {
  const nodes = [];
  const edges = [];

  // Start Node
  const entryLabel = functions.length > 0 ? `Entry: ${functions[0].name}()` : 'Program Start';
  nodes.push({
    id: 'start',
    type: 'start',
    label: entryLabel,
    line: functions.length > 0 ? functions[0].line : 1
  });

  let previousNodeId = 'start';
  let counter = 1;

  // Collect structural points
  const points = [];
  for (const fn of functions) points.push({ type: 'function', line: fn.line, item: fn });
  for (const loop of loops) points.push({ type: 'loop', line: loop.line, item: loop });
  for (const cond of conditionals) points.push({ type: 'conditional', line: cond.line, item: cond });
  for (const op of operations) points.push({ type: 'operation', line: op.line, item: op });

  points.sort((a, b) => a.line - b.line);

  const loopNodes = [];

  for (const pt of points) {
    const nodeId = `node_${counter++}`;

    if (pt.type === 'loop') {
      const loopLabel = pt.item.condition ? `Loop: ${pt.item.condition}` : `Loop (${pt.item.type})`;
      nodes.push({
        id: nodeId,
        type: 'loop',
        label: loopLabel,
        line: pt.line,
        detail: `Nesting Depth: ${pt.item.depth} · Step: ${pt.item.stepType || 'linear'}`
      });
      edges.push({ from: previousNodeId, to: nodeId, label: 'enter loop' });
      loopNodes.push(nodeId);
      previousNodeId = nodeId;
    } else if (pt.type === 'conditional') {
      const condLabel = pt.item.condition ? `If: ${pt.item.condition}` : 'Branch Check';
      nodes.push({
        id: nodeId,
        type: 'condition',
        label: condLabel,
        line: pt.line,
        detail: 'Conditional Evaluation'
      });
      edges.push({ from: previousNodeId, to: nodeId, label: 'eval' });
      previousNodeId = nodeId;
    } else if (pt.type === 'operation') {
      const isRet = pt.item.type === 'return';
      nodes.push({
        id: nodeId,
        type: isRet ? 'return' : 'operation',
        label: pt.item.description || 'Operation',
        line: pt.line
      });

      edges.push({
        from: previousNodeId,
        to: nodeId,
        label: isRet ? 'then return' : 'exec'
      });

      if (isRet) {
        edges.push({ from: nodeId, to: 'end', label: 'terminates' });
      }
      previousNodeId = nodeId;
    }
  }

  // Connect active loops back to represent cycles
  for (const lId of loopNodes) {
    edges.push({ from: previousNodeId, to: lId, label: 'next iteration' });
  }

  // End Node
  nodes.push({
    id: 'end',
    type: 'end',
    label: 'Exit / End',
    line: loc
  });

  if (previousNodeId !== 'end') {
    edges.push({ from: previousNodeId, to: 'end', label: 'finish' });
  }

  return { nodes, edges };
}

export default { buildControlFlowGraph };
