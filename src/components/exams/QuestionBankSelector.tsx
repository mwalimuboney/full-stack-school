"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import MarkdownRenderer from "../questions/MarkdownRenderer";
import { getQuestionsAction } from "@/lib/actions";

interface Question {
  id: number;
  content: string;
  type: string;
  marks: number;
  choices: { content: string; isCorrect: boolean }[];
  topic?: { name: string };
  subTopic?: { name: string };
}

interface Props {
  subjectId?: number;
  topics: { id: number; name: string }[];
  onSelect: (questions: Question[]) => void;
  selectedIds: number[];
}

export default function QuestionBankSelector({
  subjectId,
  topics,
  onSelect,
  selectedIds,
}: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [count, setCount] = useState(0);
  const [topicId, setTopicId] = useState(0);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<Set<number>>(new Set(selectedIds));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchQuestions = useCallback(() => {
    if (!subjectId) return;
    setError("");

    startTransition(async () => {
      const result = await getQuestionsAction({
        subjectId,
        topicId: topicId || undefined,
        type: type || undefined,
        search: search || undefined,
        page,
        limit: 20,
      });

      if (result.success) {
        setQuestions((result.questions as Question[]) ?? []);
        setCount(result.count ?? 0);
      } else {
        setError(result.error ?? "Failed to load questions");
        setQuestions([]);
        setCount(0);
      }
    });
  }, [subjectId, topicId, type, search, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Debounce search so we don't fire on every keystroke
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggle = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const selectableIds = questions
      .filter((q) => !selectedIds.includes(q.id))
      .map((q) => q.id);
    setChecked((prev) => new Set([...prev, ...selectableIds]));
  };

  const clearAll = () => setChecked(new Set());

  const handleAdd = () => {
    const toAdd = questions.filter((q) => checked.has(q.id));
    onSelect(toAdd);
    // Keep checked state so user can see what was already added
  };

  const totalPages = Math.ceil(count / 20);

  if (!subjectId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center text-yellow-700">
        <p className="font-medium">No subject selected</p>
        <p className="text-sm mt-1">
          Select a lesson or subject in the Settings tab to browse questions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Question Bank</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {isPending ? "Loading..." : `${count} question${count !== 1 ? "s" : ""}`}
          </span>
          {questions.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-purple-600 hover:underline"
              >
                Select all
              </button>
              {checked.size > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={clearAll}
                    className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search questions..."
          className="p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400"
        />
        <select
          value={topicId}
          onChange={(e) => {
            setTopicId(parseInt(e.target.value));
            setPage(1);
          }}
          className="p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value={0}>All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="p-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="">All types</option>
          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
          <option value="MULTIPLE_SELECT">Multiple Select</option>
          <option value="TRUE_FALSE">True / False</option>
          <option value="SHORT_ANSWER">Short Answer</option>
          <option value="LONG_ANSWER">Long Answer</option>
          <option value="FILL_BLANK">Fill in the Blank</option>
          <option value="MATCHING">Matching</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchQuestions}
            className="text-xs text-red-500 hover:text-red-700 underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Questions list */}
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-lg animate-pulse"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 space-y-2">
          <p className="text-3xl">🗃</p>
          <p className="font-medium">No questions found</p>
          <p className="text-sm">
            {search || topicId || type
              ? "Try adjusting your filters"
              : "Create questions in the New Question tab"}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {questions.map((q) => {
            const isAlreadyAdded = selectedIds.includes(q.id);
            const isChecked = checked.has(q.id);

            return (
              <div
                key={q.id}
                onClick={() => !isAlreadyAdded && toggle(q.id)}
                className={`p-3 border rounded-lg transition ${
                  isAlreadyAdded
                    ? "border-green-200 bg-green-50 cursor-default"
                    : isChecked
                    ? "border-purple-400 bg-purple-50 cursor-pointer"
                    : "border-gray-200 hover:border-purple-300 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className="mt-0.5 flex-shrink-0">
                    {isAlreadyAdded ? (
                      <div className="w-4 h-4 rounded bg-green-500 flex items-center justify-center">
                        <span className="text-white text-[10px]">✓</span>
                      </div>
                    ) : (
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                          isChecked
                            ? "bg-purple-600 border-purple-600"
                            : "border-gray-300"
                        }`}
                      >
                        {isChecked && (
                          <span className="text-white text-[10px]">✓</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="line-clamp-2 text-sm text-gray-700">
                      <MarkdownRenderer content={q.content} />
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
                        {q.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] bg-blue-50 px-2 py-0.5 rounded-full text-blue-500">
                        {q.marks} pt{q.marks !== 1 ? "s" : ""}
                      </span>
                      {q.topic && (
                        <span className="text-[10px] bg-purple-50 px-2 py-0.5 rounded-full text-purple-500">
                          {q.topic.name}
                        </span>
                      )}
                      {q.subTopic && (
                        <span className="text-[10px] bg-indigo-50 px-2 py-0.5 rounded-full text-indigo-500">
                          {q.subTopic.name}
                        </span>
                      )}
                      {isAlreadyAdded && (
                        <span className="text-[10px] bg-green-100 px-2 py-0.5 rounded-full text-green-600">
                          Already added
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isPending}
            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ←
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pageNum =
                totalPages <= 7
                  ? i + 1
                  : page <= 4
                  ? i + 1
                  : page >= totalPages - 3
                  ? totalPages - 6 + i
                  : page - 3 + i;

              if (pageNum < 1 || pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  disabled={isPending}
                  className={`w-8 h-8 rounded-lg text-sm transition ${
                    page === pageNum
                      ? "bg-purple-600 text-white"
                      : "border border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isPending}
            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            →
          </button>
        </div>
      )}

      {/* Footer action bar */}
      {checked.size > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-purple-700">{checked.size}</span>{" "}
            question{checked.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Clear
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
            >
              Add {checked.size} to Exam →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}