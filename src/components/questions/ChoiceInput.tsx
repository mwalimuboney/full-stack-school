"use client";

import { Trash2, CheckCircle2, Circle } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import { useState } from "react";

interface Choice {
  id: string;
  content: string;
  isCorrect: boolean;
}

interface Props {
  index: number;
  choice: Choice;
  onUpdate: (id: string, updates: Partial<Choice>) => void;
  onDelete: (id: string) => void;
}

export default function ChoiceInput({ index, choice, onUpdate, onDelete }: Props) {
  const [isPreview, setIsPreview] = useState(false);
  const label = String.fromCharCode(65 + index); // A, B, C...

  return (
    <div className={`group border rounded-xl p-4 transition-all ${
      choice.isCorrect 
        ? "border-green-500 bg-green-50/30 shadow-sm" 
        : "border-gray-200 bg-white hover:border-purple-200"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
            choice.isCorrect ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"
          }`}>
            {label}
          </span>
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="text-[10px] uppercase tracking-wider font-bold text-purple-600 hover:text-purple-800"
          >
            {isPreview ? "Edit Text" : "Preview Markdown"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Correct Answer Toggle */}
          <button
            type="button"
            onClick={() => onUpdate(choice.id, { isCorrect: !choice.isCorrect })}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
              choice.isCorrect
                ? "bg-green-600 border-green-600 text-white"
                : "bg-white border-gray-200 text-gray-400 hover:border-green-400 hover:text-green-600"
            }`}
          >
            {choice.isCorrect ? <CheckCircle2 size={12} /> : <Circle size={12} />}
            {choice.isCorrect ? "CORRECT" : "MARK CORRECT"}
          </button>

          {/* Delete Action */}
          <button
            type="button"
            onClick={() => onDelete(choice.id)}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isPreview ? (
        <div className="min-h-[80px] p-3 bg-white rounded-lg border border-gray-100">
          <MarkdownRenderer content={choice.content || "*No content entered yet...*"} />
        </div>
      ) : (
        <textarea
          value={choice.content}
          onChange={(e) => onUpdate(choice.id, { content: e.target.value })}
          placeholder={`Enter option ${label} content... (Supports Markdown)`}
          rows={3}
          className="w-full p-3 text-sm border-none bg-gray-50/50 rounded-lg focus:ring-2 focus:ring-purple-100 outline-none resize-none placeholder:text-gray-300"
        />
      )}
    </div>
  );
}