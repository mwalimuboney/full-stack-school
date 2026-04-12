"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { analyzeExamAI, AIExamAnalysisResult } from "@/lib/actions";

interface AIContext {
  title: string;
  description: string;
  questions: { content: string; type: string; choices: { content: string; isCorrect: boolean }[] }[];
}

interface AISuggestion {
  field: "title" | "description";
  original: string;
  suggested: string;
  reason: string;
}

interface AIResult {
  available: boolean;
  message?: string;
  suggestions?: AISuggestion[];
  overall?: string;
}

interface Props {
  context: AIContext;
  onApplySuggestion: (field: string, value: string) => void;
}

export default function FloatingAIButton({ context, onApplySuggestion }: Props) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [hasSuggestions, setHasSuggestions] = useState(false);

  const buttonRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null);
  const initialized = useRef(false);

  // Initialize position bottom-right
  useEffect(() => {
    if (!initialized.current) {
      setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 160 });
      initialized.current = true;
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input")) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      bx: position.x,
      by: position.y,
    };
  }, [position]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 56, dragStart.current.bx + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 56, dragStart.current.by + dy)),
      });
    };
    const onMouseUp = () => { setIsDragging(false); dragStart.current = null; };

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  const analyze = async () => {
    if (!context.title && context.questions.length === 0) return;
    setLoading(true);
    setResult(null);

    try {
    const data = await analyzeExamAI(context);
    setResult(data);
    if (data.available && data.suggestions && data.suggestions.length > 0) {
      setHasSuggestions(true);
      setIsExpanded(true);
    }
  } catch {
    setResult({ available: false, message: "Could not reach AI service." });
  } finally {
    setLoading(false);
  }
  };

  const applySuggestion = (suggestion: AISuggestion) => {
    setUndoStack((prev) => ({ ...prev, [suggestion.field]: suggestion.original }));
    setAppliedFields((prev) => new Set(prev).add(suggestion.field));
    onApplySuggestion(suggestion.field, suggestion.suggested);
  };

  const undoSuggestion = (field: string) => {
    if (undoStack[field]) {
      onApplySuggestion(field, undoStack[field]);
      setAppliedFields((prev) => { const n = new Set(prev); n.delete(field); return n; });
      setUndoStack((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const pendingSuggestions = result?.suggestions?.filter(
    (s) => !appliedFields.has(s.field)
  ) ?? [];

  return (
    <div
      ref={buttonRef}
      style={{ position: "fixed", left: position.x, top: position.y, zIndex: 50 }}
      onMouseDown={onMouseDown}
      className={`select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      {/* Expanded suggestion card */}
      {isExpanded && result && (
        <div
          className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden"
          style={{ maxHeight: "70vh" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700">
            <div className="flex items-center gap-2 text-white">
              <span className="text-lg">✨</span>
              <span className="font-semibold text-sm">AI Suggestions</span>
              {pendingSuggestions.length > 0 && (
                <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {pendingSuggestions.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/70 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 52px)" }}>
            {!result.available ? (
              <div className="p-4 text-sm text-gray-500">
                ⚠️ {result.message ?? "AI unavailable — you can still create the exam."}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Overall assessment */}
                {result.overall && (
                  <p className="text-xs text-gray-600 bg-purple-50 rounded-lg p-3 leading-relaxed">
                    {result.overall}
                  </p>
                )}

                {/* Suggestions */}
                {result.suggestions && result.suggestions.length > 0 ? (
                  result.suggestions.map((suggestion, i) => {
                    const isApplied = appliedFields.has(suggestion.field);
                    return (
                      <div
                        key={i}
                        className={`rounded-xl border p-3 space-y-2 transition ${
                          isApplied
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            {suggestion.field}
                          </span>
                          {isApplied ? (
                            <button
                              onClick={() => undoSuggestion(suggestion.field)}
                              className="text-[10px] text-orange-500 hover:text-orange-700 font-medium"
                            >
                              ↩ Undo
                            </button>
                          ) : (
                            <button
                              onClick={() => applySuggestion(suggestion)}
                              className="text-[10px] text-purple-600 hover:text-purple-800 font-medium"
                            >
                              Apply →
                            </button>
                          )}
                        </div>

                        {/* Reason */}
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {suggestion.reason}
                        </p>

                        {/* Diff view */}
                        {!isApplied && (
                          <div className="space-y-1">
                            <div className="text-[10px] font-medium text-gray-400">Current:</div>
                            <p className="text-xs text-red-700 bg-red-50 rounded p-2 line-through leading-relaxed break-words">
                              {suggestion.original || "(empty)"}
                            </p>
                            <div className="text-[10px] font-medium text-gray-400">Suggested:</div>
                            <p className="text-xs text-green-700 bg-green-50 rounded p-2 leading-relaxed break-words">
                              {suggestion.suggested}
                            </p>
                          </div>
                        )}

                        {isApplied && (
                          <p className="text-xs text-green-600">✓ Applied</p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-green-600 text-center py-4">
                    ✓ Everything looks good!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => {
          if (result && isExpanded) {
            setIsExpanded(false);
          } else if (result) {
            setIsExpanded(true);
          } else {
            analyze();
          }
        }}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          loading
            ? "bg-purple-300 cursor-wait"
            : hasSuggestions && pendingSuggestions.length > 0
            ? "bg-gradient-to-br from-amber-400 to-orange-500 hover:scale-110"
            : "bg-gradient-to-br from-purple-500 to-purple-700 hover:scale-110"
        }`}
        title="AI Assistant"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-xl">✨</span>
        )}
        {/* Pending badge */}
        {!loading && pendingSuggestions.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {pendingSuggestions.length}
          </span>
        )}
      </button>

      {/* Drag hint */}
      {!isDragging && !isExpanded && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 whitespace-nowrap">
          drag me
        </div>
      )}
    </div>
  );
}