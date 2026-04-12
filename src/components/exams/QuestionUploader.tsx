// src/components/exam/QuestionUploader.tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface ParsedQuestion {
  content: string;
  type: string;
  choices: { content: string; isCorrect: boolean }[];
  marks: number;
  explanation?: string;
}

interface Props {
  subjectId: number;
  onParsed: (questions: ParsedQuestion[]) => void;
}

// Expected JSON format example shown to user
const EXAMPLE_FORMAT = `[
  {
    "content": "What is 2 + 2?",
    "type": "MULTIPLE_CHOICE",
    "marks": 1,
    "choices": [
      { "content": "3", "isCorrect": false },
      { "content": "4", "isCorrect": true },
      { "content": "5", "isCorrect": false }
    ],
    "explanation": "Basic arithmetic"
  }
]`;

export default function QuestionUploader({ subjectId, onParsed }: Props) {
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);

  const parseJSON = (text: string) => {
    setError("");
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      const data = JSON.parse(cleaned);
      const questions = Array.isArray(data) ? data : [data];
      setParsed(questions);
      onParsed(questions);
    } catch {
      setError("Invalid JSON. Please check the format and try again.");
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setRawText(text);
        parseJSON(text);
      };
      reader.readAsText(file);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/json": [".json"], "text/plain": [".txt"] },
    maxFiles: 1,
  });

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          isDragActive
            ? "border-purple-400 bg-purple-50"
            : "border-gray-300 hover:border-purple-300 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-3xl mb-2">📂</div>
        {isDragActive ? (
          <p className="text-purple-600 font-medium">Drop to upload...</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">
              Drop a JSON file here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports .json and .txt files
            </p>
          </>
        )}
      </div>

      {/* Paste area */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">
          Or paste JSON directly
        </label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={8}
          placeholder={EXAMPLE_FORMAT}
          className="w-full p-3 text-xs font-mono border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400 resize-y"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
      )}

      {parsed.length > 0 && !error && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          ✓ {parsed.length} question{parsed.length !== 1 ? "s" : ""} parsed and ready to import
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => parseJSON(rawText)}
          disabled={!rawText.trim()}
          className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300"
        >
          Parse Questions
        </button>
        {parsed.length > 0 && (
          <button
            type="button"
            onClick={() => { setRawText(""); setParsed([]); setError(""); }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Format guide */}
      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer hover:text-gray-600">
          View expected JSON format
        </summary>
        <pre className="mt-2 p-3 bg-gray-50 rounded-md overflow-x-auto text-gray-600">
          {EXAMPLE_FORMAT}
        </pre>
      </details>
    </div>
  );
}