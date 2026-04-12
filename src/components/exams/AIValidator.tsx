"use client";

import { useState } from "react";
// Import the server action you created
import { validateQuestionAI } from "@/lib/actions";

interface Choice {
  content: string;
  isCorrect: boolean;
}

interface ValidationResult {
  available: boolean;
  message?: string;
  valid?: boolean;
  issues?: string[];
  suggestions?: string[];
  clarity_score?: number;
  difficulty?: string;
}

interface Props {
  question: string;
  choices: Choice[];
  type: string;
  onResult?: (result: ValidationResult) => void;
}

export default function AIValidator({ question, choices, type, onResult }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const validate = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null); // Clear previous results before starting

    try {
      // Direct call to Server Action instead of fetch
      const data = await validateQuestionAI(question, type, choices);
      
      setResult(data);
      onResult?.(data);
    } catch (error) {
      console.error("AI Validation Error:", error);
      setResult({ 
        available: false, 
        message: "AI service encountered an error. Please try again later." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={validate}
        disabled={loading || !question.trim()}
        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 transition disabled:opacity-50"
      >
        {loading ? (
          <>
            <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
            Validating...
          </>
        ) : (
          <>✨ Validate with AI</>
        )}
      </button>

      {result && (
        <div className={`mt-2 p-3 rounded-md text-xs border ${
          !result.available
            ? "bg-gray-50 border-gray-200 text-gray-500"
            : result.valid
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-yellow-50 border-yellow-200 text-yellow-800"
        }`}>
          {!result.available ? (
            <p className="flex items-center gap-2">
              <span className="text-base">⚠️</span> 
              {result.message ?? "AI unavailable — you can still save the question."}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className={`font-bold uppercase tracking-tight ${result.valid ? "text-green-700" : "text-yellow-700"}`}>
                  {result.valid ? "✓ Validated" : "⚠ Review Required"}
                </span>
                {result.clarity_score && (
                  <span className="bg-white/50 px-2 py-0.5 rounded border border-current opacity-70">
                    Clarity: {result.clarity_score}/10
                  </span>
                )}
                {result.difficulty && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    result.difficulty === "easy" ? "bg-green-100 text-green-700" :
                    result.difficulty === "medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {result.difficulty}
                  </span>
                )}
              </div>

              {result.issues && result.issues.length > 0 && (
                <div className="mb-2">
                  <p className="font-bold text-yellow-800 mb-1 underline decoration-yellow-300">Potential Issues:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-1">
                    {result.issues.map((issue, i) => (
                      <li key={i} className="text-yellow-700 italic">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestions && result.suggestions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-blue-100">
                  <p className="font-bold text-blue-800 mb-1 underline decoration-blue-200">AI Suggestions:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-1">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="text-blue-700">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}