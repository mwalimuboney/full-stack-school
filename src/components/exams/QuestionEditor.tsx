// src/components/exam/QuestionEditor.tsx
"use client";

import { useState } from "react";
import AIValidator from "./AIValidator";
import MarkdownRenderer from "../questions/MarkdownRenderer";

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_SELECT"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "LONG_ANSWER"
  | "FILL_BLANK"
  | "MATCHING";

export interface Choice {
  content: string;
  isCorrect: boolean;
  imageUrl?: string;
}

export interface QuestionData {
  content: string;
  type: QuestionType;
  marks: number;
  explanation: string;
  imageUrl?: string;
  subjectId: number;
  topicId?: number;
  subTopicId?: number;
  choices: Choice[];
}

interface Props {
  subjectId: number;
  topics: { id: number; name: string }[];
  subTopics: { id: number; name: string; topicId: number }[];
  onSave: (question: QuestionData) => void;
  onCancel: () => void;
  initial?: Partial<QuestionData>;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  MULTIPLE_SELECT: "Multiple Select",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short Answer",
  LONG_ANSWER: "Long Answer",
  FILL_BLANK: "Fill in the Blank",
  MATCHING: "Matching",
};

export default function QuestionEditor({
  subjectId,
  topics,
  subTopics,
  onSave,
  onCancel,
  initial,
}: Props) {
  const [content, setContent] = useState(initial?.content ?? "");
  const [type, setType] = useState<QuestionType>(initial?.type ?? "MULTIPLE_CHOICE");
  const [marks, setMarks] = useState(initial?.marks ?? 1);
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [topicId, setTopicId] = useState(initial?.topicId ?? 0);
  const [subTopicId, setSubTopicId] = useState(initial?.subTopicId ?? 0);
  const [choices, setChoices] = useState<Choice[]>(
    initial?.choices ?? [
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
    ]
  );
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredSubTopics = subTopics.filter((st) => st.topicId === topicId);
  const needsChoices = ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE"].includes(type);

  const addChoice = () =>
    setChoices((prev) => [...prev, { content: "", isCorrect: false }]);

  const removeChoice = (index: number) =>
    setChoices((prev) => prev.filter((_, i) => i !== index));

  const updateChoice = (index: number, updates: Partial<Choice>) =>
    setChoices((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );

  const toggleCorrect = (index: number) => {
    if (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") {
      // Single correct answer
      setChoices((prev) =>
        prev.map((c, i) => ({ ...c, isCorrect: i === index }))
      );
    } else {
      // Multiple correct answers
      updateChoice(index, { isCorrect: !choices[index].isCorrect });
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave({
        content,
        type,
        marks,
        explanation,
        subjectId,
        topicId: topicId || undefined,
        subTopicId: subTopicId || undefined,
        choices: needsChoices ? choices : [],
      });
    } finally {
      setSaving(false);
    }
  };

  // Initialize TRUE_FALSE choices
  const initTrueFalse = () => {
    setChoices([
      { content: "True", isCorrect: true },
      { content: "False", isCorrect: false },
    ]);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Question Editor</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>

      {/* Type + Topic row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Question Type</label>
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as QuestionType;
              setType(t);
              if (t === "TRUE_FALSE") initTrueFalse();
            }}
            className="w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400"
          >
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Topic</label>
          <select
            value={topicId}
            onChange={(e) => { setTopicId(parseInt(e.target.value)); setSubTopicId(0); }}
            className="w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value={0}>— No topic —</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Sub-topic</label>
          <select
            value={subTopicId}
            onChange={(e) => setSubTopicId(parseInt(e.target.value))}
            disabled={!topicId}
            className="w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50"
          >
            <option value={0}>— No sub-topic —</option>
            {filteredSubTopics.map((st) => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Question content */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-500">
            Question <span className="text-gray-400">(Markdown supported)</span>
          </label>
          <span className="text-xs text-gray-400">{content.length} chars</span>
        </div>

        {preview ? (
          <div className="min-h-[100px] p-3 border border-gray-200 rounded-md bg-gray-50">
            <MarkdownRenderer content={content || "_Nothing to preview_"} />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Enter question text... (supports **bold**, *italic*, `code`, math: $E=mc^2$)"
            className="w-full p-3 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400 resize-y font-mono"
          />
        )}

        <AIValidator question={content} choices={choices} type={type} />
      </div>

      {/* Choices */}
      {needsChoices && (
        <div>
          <label className="text-xs text-gray-500 mb-2 block">
            Answer Choices{" "}
            {type === "MULTIPLE_CHOICE" && (
              <span className="text-gray-400">— select one correct</span>
            )}
            {type === "MULTIPLE_SELECT" && (
              <span className="text-gray-400">— select all correct</span>
            )}
          </label>

          <div className="space-y-2">
            {choices.map((choice, index) => (
              <div key={index} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggleCorrect(index)}
                  className={`mt-2 w-5 h-5 flex-shrink-0 rounded-full border-2 transition ${
                    choice.isCorrect
                      ? "bg-green-500 border-green-500"
                      : "border-gray-300 hover:border-green-400"
                  }`}
                  title="Mark as correct"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={choice.content}
                    onChange={(e) => updateChoice(index, { content: e.target.value })}
                    placeholder={`Choice ${index + 1}...`}
                    disabled={type === "TRUE_FALSE"}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50"
                  />
                </div>
                {type !== "TRUE_FALSE" && choices.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeChoice(index)}
                    className="mt-2 text-red-400 hover:text-red-600 text-lg leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {type !== "TRUE_FALSE" && choices.length < 8 && (
            <button
              type="button"
              onClick={addChoice}
              className="mt-2 text-xs text-blue-500 hover:underline"
            >
              + Add choice
            </button>
          )}
        </div>
      )}

      {/* Marks + Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Marks</label>
          <input
            type="number"
            value={marks}
            min={1}
            max={100}
            onChange={(e) => setMarks(parseInt(e.target.value))}
            className="w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">
          Explanation <span className="text-gray-400">(shown to students after exam)</span>
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          placeholder="Optional explanation for the correct answer..."
          className="w-full p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400 resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="px-4 py-2 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Question"}
        </button>
      </div>
    </div>
  );
}