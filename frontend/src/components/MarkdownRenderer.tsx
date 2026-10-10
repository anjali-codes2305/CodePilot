import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders AI markdown responses with code syntax highlighting.
 * Used by both AnalysisPanel and ChatInterface.
 */
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Syntax-highlighted code blocks
        code(props) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');
          const isBlock = match !== null;

          if (isBlock) {
            return (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  margin: '0.75rem 0',
                  padding: '1rem',
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          }

          return (
            <code
              {...rest}
              className="bg-gray-700/70 text-blue-200 px-1.5 py-0.5 rounded text-xs font-mono"
            >
              {children}
            </code>
          );
        },
        // Style headers
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-blue-300 mt-5 mb-2 border-b border-gray-700 pb-1">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-gray-200 mt-4 mb-1.5">{children}</h3>
        ),
        // Style blockquotes (used in mentor mode for guiding questions)
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-blue-500 pl-3 text-gray-300 italic my-3">
            {children}
          </blockquote>
        ),
        // Style lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 text-gray-300 my-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 text-gray-300 my-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm leading-relaxed">{children}</li>
        ),
        p: ({ children }) => (
          <p className="text-sm text-gray-300 leading-relaxed my-2">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="text-gray-100 font-semibold">{children}</strong>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full divide-y divide-gray-700 text-xs border border-gray-700 rounded-lg overflow-hidden">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 bg-gray-800 text-left font-semibold text-gray-200">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-t border-gray-800 text-gray-300">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
