"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import Image from "next/image";

// Styles
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css"; 

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: Props) {
  return (
    <div className={`prose prose-sm max-w-none prose-slate prose-headings:font-bold prose-p:leading-relaxed ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          // Handles both standard URLs and local preview Blobs
          img: ({ src, alt }) => {
            if (!src) return null;

            const isStringSrc = typeof src === "string";
  
            const isUnoptimized = isStringSrc && (src.startsWith('blob:') || src.startsWith('data:'));
            
            return (
              <span className="block my-4 flex justify-center">
                <Image
                  src={src as string}
                  alt={alt ?? "Exam Illustration"}
                  width={800}
                  height={500}
                  className="rounded-lg shadow-sm max-w-full h-auto object-contain border border-gray-100"
                    unoptimized={isUnoptimized}
                />
              </span>
            );
          },

          // Structured tables for exams
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 font-bold text-gray-700">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left border-r last:border-0 border-gray-200 font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 border-t border-r last:border-0 border-gray-200 text-gray-600">{children}</td>
          ),

          // Code blocks for CS/Programming questions
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            return inline ? (
              <code
                className="bg-gray-100 px-1.5 py-0.5 rounded text-pink-600 font-mono text-[0.9em]"
                {...props}
              >
                {children}
              </code>
            ) : (
              <div className="relative group my-4">
                <div className="absolute right-3 top-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  {match ? match[1] : 'code'}
                </div>
                <code
                  className={`${className} block bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto shadow-inner font-mono text-sm leading-relaxed`}
                  {...props}
                >
                  {children}
                </code>
              </div>
            );
          },

          // Academic Style Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-purple-600 hover:text-purple-800 font-medium underline underline-offset-4 decoration-purple-300 transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}