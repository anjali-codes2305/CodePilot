import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import type { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (question: string) => void;
  isEnabled: boolean;
}

const SUGGESTED_QUESTIONS = [
  "How many loops are in this code?",
  "What is the time complexity?",
  "Why did you use this approach?",
  "What happens if the input is empty or null?",
  "Explain this like I'm a beginner",
  "Ask me an interview question based on this code"
];

/**
 * Open-ended chat interface for follow-up questions about code.
 * Routes deterministic factual questions to CodePilot AST (0 tokens)
 * and deep pedagogical questions to Gemini.
 */
export default function ChatInterface({
  messages,
  isLoading,
  error,
  onSendMessage,
  isEnabled
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !isEnabled) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  };

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!isEnabled) {
    return (
      <div className="flex items-center justify-center h-16 text-gray-600 text-sm">
        Analyze code first to start a conversation
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Suggested prompts when conversation hasn't started yet */}
      {messages.length === 0 && (
        <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
          <p className="text-xs text-gray-400 font-semibold mb-2">💡 Suggested Questions to Ask:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(q)}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-gray-700 hover:border-cyan-500/40 transition-colors text-left disabled:opacity-50 cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message History */}
      <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <span className="text-base shrink-0 mt-0.5">
                {msg.source === 'codepilot' ? '⚡' : '🧑‍🏫'}
              </span>
            )}
            <div
              className={`
                max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm relative
                ${msg.role === 'user'
                  ? 'bg-blue-600/30 text-blue-100 border border-blue-700/50'
                  : 'bg-gray-800/80 border border-gray-700/50'
                }
              `}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-gray-700/40 text-[10px] font-mono">
                  {msg.source === 'codepilot' ? (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <span>⚡</span>
                      <span>CodePilot AST Intelligence (0 LLM Tokens)</span>
                    </span>
                  ) : (
                    <span className="text-cyan-400 font-semibold flex items-center gap-1">
                      <span>🧠</span>
                      <span>Gemini Teaching Engine</span>
                    </span>
                  )}
                </div>
              )}

              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <>
                  <MarkdownRenderer content={msg.content} />
                  <div className="mt-2 pt-1 border-t border-gray-700/50 flex justify-end">
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="text-[10px] text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {copiedIdx === idx ? '✓ Copied' : '📋 Copy response'}
                    </button>
                  </div>
                </>
              )}
            </div>
            {msg.role === 'user' && (
              <span className="text-base shrink-0 mt-0.5">👤</span>
            )}
          </div>
        ))}

        {/* Loading indicator for AI response */}
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <span className="text-base shrink-0">🧑‍🏫</span>
            <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl px-3 py-2">
              <div className="flex gap-1.5 items-center h-5">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                <span className="text-xs text-gray-400 ml-1.5 font-mono">Consulting CodePilot & Gemini...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2 items-end border border-gray-700 rounded-xl p-2 bg-gray-800/60 focus-within:border-cyan-500 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your code (e.g. loops, complexity, or why)..."
          disabled={isLoading || !isEnabled}
          rows={1}
          className="flex-1 bg-transparent text-gray-100 text-sm resize-none outline-none placeholder-gray-500 disabled:opacity-50 leading-relaxed py-0.5"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || !isEnabled}
          className="shrink-0 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <span>Send</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>Press <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">Shift+Enter</kbd> for newline</span>
      </div>
    </div>
  );
}
