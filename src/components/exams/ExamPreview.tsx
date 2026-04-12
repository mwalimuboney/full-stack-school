"use client";

import { useState } from "react";
import MarkdownRenderer from "../questions/MarkdownRenderer";
import FileViewer from "../questions/FileViewer";
import { Eye, EyeOff, FileText } from "lucide-react"; // Optional: if using lucide-react

interface Question {
  content: string;
  type: string;
  marks: number;
  choices: { content: string; isCorrect: boolean }[];
  explanation?: string | null;
}

interface Resource {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Props {
  title: string;
  description: string;
  questions: Question[];
  resources: Resource[];
  totalMarks: number;
}

export default function ExamPreview({
  title,
  description,
  questions,
  resources,
  totalMarks,
}: Props) {
  const [showAnswers, setShowAnswers] = useState(true);

  if (!title && questions.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
        Nothing to preview yet. Add a title and questions to see the magic happen.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Exam header */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{title || "Untitled Exam"}</h1>
            {description && (
              <p className="mt-2 text-purple-100 text-sm max-w-2xl">{description}</p>
            )}
          </div>
          <button 
            onClick={() => setShowAnswers(!showAnswers)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-white/20"
          >
            {showAnswers ? <EyeOff size={14} /> : <Eye size={14} />}
            {showAnswers ? "Hide Answers" : "Show Answers"}
          </button>
        </div>
        
        <div className="flex gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2 text-purple-200">
            <span className="bg-purple-500/30 px-2 py-0.5 rounded-md border border-purple-400/30">
              {questions.length} Questions
            </span>
            <span className="bg-purple-500/30 px-2 py-0.5 rounded-md border border-purple-400/30">
              {totalMarks} Total Marks
            </span>
          </div>
        </div>
      </div>

      {/* Resources Section - Grid Layout */}
      {resources.length > 0 && (
        <div className="p-6 bg-gray-50/50 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
            <FileText size={18} className="text-purple-600" />
            <h3>Reference Materials</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resources.map((r, i) => (
              <FileViewer key={i} url={r.url} type={r.type} name={r.name} />
            ))}
          </div>
        </div>
      )}

      {/* Questions Section */}
      <div className="p-8 space-y-10">
        {questions.map((q, index) => (
          <div key={index} className="group relative">
            <div className="flex items-start justify-between gap-6">
              <div className="flex gap-4 flex-1">
                <span className="font-black text-gray-200 text-3xl tabular-nums leading-none">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <div className="flex-1 pt-1">
                  <div className="prose prose-slate max-w-none">
                    <MarkdownRenderer content={q.content} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                  {q.marks} {q.marks === 1 ? 'Point' : 'Points'}
                </span>
              </div>
            </div>

            {/* Choices */}
            {q.choices.length > 0 && (
              <div className="ml-12 mt-4 grid grid-cols-1 gap-2">
                {q.choices.map((choice, ci) => (
                  <div
                    key={ci}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      showAnswers && choice.isCorrect
                        ? "bg-green-50 border-green-200 ring-1 ring-green-100"
                        : "bg-white border-gray-100"
                    }`}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                       showAnswers && choice.isCorrect ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      {String.fromCharCode(65 + ci)}
                    </span>
                    <div className="flex-1 text-sm leading-relaxed">
                      <MarkdownRenderer content={choice.content} />
                    </div>
                    {showAnswers && choice.isCorrect && (
                      <span className="text-green-600 font-bold text-[10px] uppercase tracking-widest px-2">
                        Correct
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Explanation - Visible only if toggle is on */}
            {showAnswers && q.explanation && (
              <div className="ml-12 mt-4 p-4 bg-indigo-50/50 border-l-4 border-indigo-400 rounded-r-lg text-sm text-indigo-900 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 mb-1 font-bold text-indigo-700 uppercase text-[10px] tracking-widest">
                  <span>Explanation</span>
                </div>
                <MarkdownRenderer content={q.explanation} />
              </div>
            )}
            
            {/* Divider */}
            {index !== questions.length - 1 && (
              <div className="absolute -bottom-5 left-12 right-0 border-b border-gray-100" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}