import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { PeerCursor } from '../types';

const MONACO_LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
  kotlin: 'kotlin',
  swift: 'swift',
  php: 'php',
  ruby: 'ruby',
};

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  highlightedLine?: number | null;
  peerCursors?: PeerCursor[];
  isViewer?: boolean;
  onCursorChange?: (position: { lineNumber: number; column: number }, selection?: any) => void;
}

export default function CodeEditor({
  code,
  language,
  onChange,
  disabled = false,
  highlightedLine,
  peerCursors = [],
  isViewer = false,
  onCursorChange
}: CodeEditorProps) {
  const monacoLanguage = MONACO_LANGUAGE_MAP[language] || 'plaintext';
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const lineHighlightDecorationsRef = useRef<string[]>([]);
  const peerCursorDecorationsRef = useRef<string[]>([]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Listen to cursor position changes to broadcast
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        const selection = editor.getSelection();
        onCursorChange(
          { lineNumber: e.position.lineNumber, column: e.position.column },
          selection
        );
      }
    });
  };

  // Synchronize line highlight
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      if (highlightedLine && highlightedLine > 0) {
        editorRef.current.revealLineInCenter(highlightedLine);
        lineHighlightDecorationsRef.current = editorRef.current.deltaDecorations(
          lineHighlightDecorationsRef.current,
          [
            {
              range: new monacoRef.current.Range(highlightedLine, 1, highlightedLine, 1),
              options: {
                isWholeLine: true,
                className: 'bg-cyan-500/20 border-l-2 border-cyan-400'
              }
            }
          ]
        );
      } else {
        lineHighlightDecorationsRef.current = editorRef.current.deltaDecorations(
          lineHighlightDecorationsRef.current,
          []
        );
      }
    }
  }, [highlightedLine]);

  // Synchronize peer cursors & selections
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const newDecorations: any[] = [];

      peerCursors.forEach((peer) => {
        if (!peer.position) return;
        const { lineNumber, column } = peer.position;

        // Cursor line marker & glyph
        newDecorations.push({
          range: new monacoRef.current.Range(lineNumber, column, lineNumber, column + 1),
          options: {
            className: 'border-l-2 border-amber-400',
            hoverMessage: { value: `**${peer.userName}** is editing here` }
          }
        });

        // Peer text selection highlight if selecting
        if (peer.selection && (peer.selection.startLineNumber !== peer.selection.endLineNumber || peer.selection.startColumn !== peer.selection.endColumn)) {
          newDecorations.push({
            range: new monacoRef.current.Range(
              peer.selection.startLineNumber,
              peer.selection.startColumn,
              peer.selection.endLineNumber,
              peer.selection.endColumn
            ),
            options: {
              className: 'bg-amber-400/20'
            }
          });
        }
      });

      peerCursorDecorationsRef.current = editorRef.current.deltaDecorations(
        peerCursorDecorationsRef.current,
        newDecorations
      );
    }
  }, [peerCursors]);

  const isReadOnly = disabled || isViewer;

  return (
    <div className="relative h-full rounded-lg overflow-hidden border border-gray-700 flex flex-col">
      {isViewer && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-3 py-1.5 flex items-center justify-between text-xs text-amber-200 shrink-0 z-10">
          <div className="flex items-center gap-1.5 font-semibold">
            <span>👁️</span>
            <span>Viewer Mode (Read-Only)</span>
          </div>
          <span className="text-[11px] text-amber-400/80">
            Ask the room host for Editor permissions to modify code.
          </span>
        </div>
      )}

      {/* Peer Cursors Header Tag Pills */}
      {peerCursors.length > 0 && (
        <div className="absolute top-2 right-4 z-10 flex items-center gap-1 pointer-events-none">
          {peerCursors.map((peer) => (
            <span
              key={peer.clientId}
              className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm flex items-center gap-1 animate-pulse"
              style={{ backgroundColor: peer.color || '#06b6d4' }}
            >
              <span>●</span>
              <span>{peer.userName} (L{peer.position.lineNumber})</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={monacoLanguage}
          value={code}
          onChange={(val) => {
            if (!isReadOnly) {
              onChange(val || '');
            }
          }}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            padding: { top: 16, bottom: 16 },
            readOnly: isReadOnly,
            automaticLayout: true,
            tabSize: 2,
            bracketPairColorization: { enabled: true },
            suggest: { showWords: !isReadOnly },
            quickSuggestions: !isReadOnly,
          }}
        />
      </div>
    </div>
  );
}
