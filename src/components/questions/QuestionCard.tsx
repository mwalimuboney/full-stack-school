"use client";

import MarkdownRenderer from "./MarkdownRenderer";
import { CheckCircle2, Circle, Hash, Layers, BookOpen } from "lucide-react";

interface Choice {
  id: string;
  content: string;
  isCorrect: boolean;
}

interface QuestionProps {
  question: {
    id: string;
    content: string;
    type: string;
    marks: number;
    subject: { name: string };
    topic?: { name: string } | null;
    explanation?: string | null;
    choices: Choice[];
  };
  showCorrect?: boolean; // Toggle to show/hide the correct answer highlight
}

export default function QuestionCard({ question, showCorrect = true }: QuestionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
      {/* Top Header: Metadata */}
      <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-100">
            <BookOpen size={12} />
            {question.subject.name}
          </div>
          {question.topic && (
            <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-100">
              <Layers size={12} />
              {question.topic.name}
            </div>
          )}
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Hash size={12} />
            {question.type.replace(/_/g, " ")}
          </div>
        </div>
        <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-200">
          {question.marks} PTS
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="prose prose-slate max-w-none mb-6">
          <MarkdownRenderer content={question.content} />
        </div>

        {/* Choices Grid */}
        {question.choices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {question.choices.map((choice, index) => {
              const isCorrect = showCorrect && choice.isCorrect;
              
              return (
                <div
                  key={choice.id}
                  className={`relative flex items-start gap-3 p-4 rounded-lg border transition-all ${
                    isCorrect
                      ? "bg-green-50 border-green-200 ring-1 ring-green-100"
                      : "bg-white border-gray-100 group-hover:border-gray-200"
                  }`}
                >
                  <div className={`mt-0.5 flex-shrink-0 ${isCorrect ? "text-green-600" : "text-gray-300"}`}>
                    {isCorrect ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${isCorrect ? "text-green-600" : "text-gray-400"}`}>
                      Option {String.fromCharCode(65 + index)}
                    </span>
                    <div className={`text-sm leading-relaxed ${isCorrect ? "text-green-900 font-medium" : "text-gray-600"}`}>
                      <MarkdownRenderer content={choice.content} />
                    </div>
                  </div>

                  {isCorrect && (
                    <span className="absolute top-2 right-3 text-[9px] font-black uppercase text-green-600 bg-white px-1.5 py-0.5 rounded border border-green-200 shadow-sm">
                      Correct
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-6 py-3 bg-gray-50/30 border-t border-gray-50 flex justify-end gap-2">
         <button className="text-[11px] font-bold text-gray-400 hover:text-purple-600 uppercase tracking-widest px-3 py-1 rounded transition-colors">
            Analyze Results
         </button>
         <button className="text-[11px] font-bold text-purple-600 hover:bg-purple-50 uppercase tracking-widest px-3 py-1 rounded transition-colors">
            Edit Question
         </button>
      </div>
    </div>
  );
}