"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import QuestionEditor, { QuestionData } from "./QuestionEditor";
import QuestionUploader from "./QuestionUploader";
import QuestionBankSelector from "./QuestionBankSelector";
import FileResourceUploader from "./FileResourceUploader";
import ExamPreview from "./ExamPreview";
import FloatingAIButton from "./FloatingAIButton";
import { createExamAction, createQuestionAction  } from "@/lib/actions";

const DRAFT_KEY = "exam_creator_draft_v2";

interface SelectedQuestion {
  id?: number;
  content: string;
  type: string;
  marks: number;
  choices: { 
    content: string; 
    isCorrect: boolean; 
    [key: string]: any; 
  }[];
  explanation?: string | null;
}

interface Resource {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface DraftState {
  title: string;
  description: string;
  lessonId: number;
  subjectId: number;
  classId: number;
  startTime: string;
  endTime: string;
  visibility: "PRIVATE" | "PUBLIC" | "CLASS_ONLY";
  selectedQuestions: SelectedQuestion[];
  resources: Resource[];
}

const INITIAL_DRAFT: DraftState = {
  title: "",
  description: "",
  lessonId: 0,
  subjectId: 0,
  classId: 0,
  startTime: "",
  endTime: "",
  visibility: "PRIVATE",
  selectedQuestions: [],
  resources: [],
};

type Tab = "settings" | "bank" | "new" | "upload" | "resources" | "preview";

interface Subject {
  id: number;
  name: string;
  topics: {
    id: number;
    name: string;
    subTopics: { id: number; name: string; topicId: number }[];
  }[];
}

interface Lesson {
  id: number;
  name: string;
  subject: { id: number; name: string };
  class: { id: number; name: string };
}

interface Props {
  subjects: Subject[];
  lessons: Lesson[];
  classes: { id: number; name: string }[];
  role: string;
}

// Step definitions
const STEPS = [
  { id: "settings", label: "Settings", icon: "⚙️" },
  { id: "questions", label: "Questions", icon: "❓" },
  { id: "resources", label: "Resources", icon: "📎" },
  { id: "preview", label: "Preview", icon: "👁" },
] as const;

type Step = typeof STEPS[number]["id"];

function isSettingsComplete(draft: DraftState): boolean {
  return (
    draft.title.trim().length > 0 &&
    (draft.lessonId > 0 || (draft.subjectId > 0 && draft.classId > 0)) &&
    draft.startTime !== "" &&
    draft.endTime !== ""
  );
}

function isQuestionsComplete(draft: DraftState): boolean {
  return draft.selectedQuestions.length > 0;
}

function isResourcesComplete(_draft: DraftState): boolean {
  return true; // optional step, always complete
}

export default function ExamCreator({ subjects, lessons, classes, role }: Props) {
  const router = useRouter();
  const [draft, setDraft, clearDraft] = useLocalStorage<DraftState>(DRAFT_KEY, INITIAL_DRAFT);
  const [activeStep, setActiveStep] = useState<Step>("settings");
  const [activeTab, setActiveTab] = useState<Tab>("settings");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const update = useCallback(<K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, [setDraft]);

  const selectedLesson = lessons.find((l) => l.id === draft.lessonId);
  const currentSubjectId = draft.lessonId > 0
    ? selectedLesson?.subject.id ?? 0
    : draft.subjectId;
  const selectedSubject = subjects.find((s) => s.id === currentSubjectId);
  const allTopics = selectedSubject?.topics ?? [];
  const allSubTopics = allTopics.flatMap((t) => t.subTopics);
  const totalMarks = draft.selectedQuestions.reduce((sum, q) => sum + q.marks, 0);

  const stepComplete: Record<Step, boolean> = {
    settings: isSettingsComplete(draft),
    questions: isQuestionsComplete(draft),
    resources: isResourcesComplete(draft),
    preview: isSettingsComplete(draft) && isQuestionsComplete(draft),
  };

  const handleStepClick = (step: Step) => {
    setActiveStep(step);
    if (step === "questions") setActiveTab("bank");
    else if (step === "resources") setActiveTab("resources");
    else if (step === "preview") setActiveTab("preview");
    else setActiveTab("settings");
  };

  const addQuestionsFromBank = (questions: SelectedQuestion[]) => {
    const existingIds = new Set(draft.selectedQuestions.map((q) => q.id));
    const newOnes = questions.filter((q) => !q.id || !existingIds.has(q.id));
    update("selectedQuestions", [...draft.selectedQuestions, ...newOnes]);
  };

  const addNewQuestion = async (data: QuestionData) => {
  setSaving(true);
  setError("");

  // 2. Call the Server Action directly
  const result = await createQuestionAction(data);

  if (result.success && result.data) {
    // 3. result.data contains the created question with its ID from Prisma
    update("selectedQuestions", [
      ...draft.selectedQuestions, 
      { ...result.data, id: result.data.id }
    ]);
    setActiveTab("bank");
  } else {
    setError(result.error || "Failed to save question");
  }
  setSaving(false);
};

  const removeQuestion = (index: number) => {
    update("selectedQuestions", draft.selectedQuestions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newList = [...draft.selectedQuestions];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newList.length) return;
    [newList[index], newList[target]] = [newList[target], newList[index]];
    update("selectedQuestions", newList);
  };

  const handleSubmit = async () => {
    if (!isSettingsComplete(draft) || !isQuestionsComplete(draft)) {
      setError("Please complete all required steps before creating the exam.");
      return;
    }
    setSaving(true);
    setError("");
    try {
       const result = await createExamAction({
        title: draft.title,
        description: draft.description,
        lessonId: draft.lessonId || undefined,
        subjectId: draft.subjectId || undefined,
        classId: draft.classId ? String(draft.classId) : undefined,
        startTime: draft.startTime,
        endTime: draft.endTime,
        durationMinutes: 60, // Add missing required fields from your CreateExamInput type
        shuffleQuestions: false,
        shuffleChoices: false,
        showResultsImmediately: true,
        passingScore: 50,
        maxAttempts: 1,
        isPublic: draft.visibility === "PUBLIC",
        requiresProctoring: false,
        visibility: draft.visibility,
        questionIds: draft.selectedQuestions.map((q) => q.id).filter((id): id is number => !!id),
        questionMarks: Object.fromEntries(
          draft.selectedQuestions.map((q) => [q.id, q.marks])
        ),
      });
      if (result.success) {
        clearDraft();
        setSuccess(true);
        setTimeout(() => { 
          router.push("/list/exams"); 
          router.refresh(); 
        }, 2500);
      } else {
        setError("Failed to create exam. " + (result.error || ""));
      }

    } catch (err) {
      setError("Failed to create exam. Please try again.");
    } finally {
      setSaving(false);
    }

  };

  const questionTabs: { id: Tab; label: string }[] = [
    { id: "bank", label: "🗃 Question Bank" },
    { id: "new", label: "✏️ New Question" },
    { id: "upload", label: "📤 Bulk Upload" },
  ];

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 animate-in fade-in">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl animate-bounce">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Exam Created!</h2>
        <p className="text-gray-500">Redirecting to your exams list...</p>
        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full animate-[progress_2.5s_ease-in-out_forwards]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Draft banner */}
      {draft.title && (
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <span className="text-amber-700">
            📝 Draft saved — <strong>{draft.title}</strong>
          </span>
          <button
            onClick={() => { clearDraft(); }}
            className="text-xs text-amber-500 hover:text-amber-700 underline"
          >
            Clear draft
          </button>
        </div>
      )}

      {/* ── Step tracker ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center">
          {STEPS.map((step, index) => {
            const isActive = activeStep === step.id;
            const isComplete = stepComplete[step.id];
            const isLast = index === STEPS.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => handleStepClick(step.id)}
                  className={`flex flex-col items-center gap-1.5 group transition-all ${
                    isActive ? "scale-105" : "hover:scale-102"
                  }`}
                >
                  {/* Circle */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    isComplete
                      ? "bg-green-500 border-green-500 text-white"
                      : isActive
                      ? "bg-purple-600 border-purple-600 text-white"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}>
                    {isComplete ? "✓" : step.icon}
                  </div>
                  {/* Label */}
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? "text-purple-700"
                      : isComplete
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}>
                    {step.label}
                  </span>
                </button>

                {/* Connector line */}
                {!isLast && (
                  <div className="flex-1 mx-2 mb-5">
                    <div className="h-1 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all duration-500"
                        style={{ width: isComplete ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <span>⚠️</span> {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* ── SETTINGS STEP ────────────────────────────────────────────────────── */}
      {activeTab === "settings" && (
        <SettingsPanel
          draft={draft}
          update={update}
          lessons={lessons}
          subjects={subjects}
          classes={classes}
          isComplete={stepComplete.settings}
          onNext={() => handleStepClick("questions")}
        />
      )}

      {/* ── QUESTIONS STEP ───────────────────────────────────────────────────── */}
      {(activeTab === "bank" || activeTab === "new" || activeTab === "upload") && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {questionTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-white text-purple-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Selected summary */}
          {draft.selectedQuestions.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl">
              <div className="text-sm">
                <span className="font-bold text-purple-700">{draft.selectedQuestions.length}</span>
                <span className="text-gray-500 ml-1">question{draft.selectedQuestions.length !== 1 ? "s" : ""} selected</span>
              </div>
              <div className="text-sm">
                <span className="font-bold text-purple-700">{totalMarks}</span>
                <span className="text-gray-500 ml-1">total marks</span>
              </div>
              <button
                onClick={() => { setActiveStep("questions"); setActiveTab("bank"); }}
                className="ml-auto text-xs text-purple-600 hover:underline"
              >
                Edit selection →
              </button>
            </div>
          )}

          {activeTab === "bank" && (
            <QuestionBankSelector
              subjectId={selectedSubject?.id}
              topics={allTopics}
              onSelect={addQuestionsFromBank}
              selectedIds={draft.selectedQuestions.map((q) => q.id).filter(Boolean) as number[]}
            />
          )}

          {activeTab === "new" && selectedSubject ? (
            <QuestionEditor
              subjectId={selectedSubject.id}
              topics={allTopics}
              subTopics={allSubTopics}
              onSave={addNewQuestion}
              onCancel={() => setActiveTab("bank")}
            />
          ) : activeTab === "new" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center text-yellow-700">
              Please select a lesson or subject in Settings first.
            </div>
          )}

          {activeTab === "upload" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Bulk Upload Questions</h2>
              <QuestionUploader
                subjectId={selectedSubject?.id ?? 0}
                onParsed={(questions) => {
                  update("selectedQuestions", [...draft.selectedQuestions, ...questions]);
                  setActiveTab("bank");
                }}
              />
            </div>
          )}

          {/* Selected questions list */}
          {draft.selectedQuestions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Questions in this exam
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {draft.selectedQuestions.map((q, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 group"
                  >
                    <span className="text-xs text-gray-400 font-mono w-5 flex-shrink-0">{index + 1}.</span>
                    <p className="flex-1 text-sm text-gray-700 truncate">{q.content}</p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <input
                        type="number"
                        value={q.marks}
                        min={1}
                        onChange={(e) => {
                          const newList = [...draft.selectedQuestions];
                          newList[index] = { ...newList[index], marks: parseInt(e.target.value) || 1 };
                          update("selectedQuestions", newList);
                        }}
                        className="w-12 p-1 text-xs border border-gray-300 rounded text-center"
                      />
                      <span className="text-xs text-gray-400">pts</span>
                      <button onClick={() => moveQuestion(index, "up")} disabled={index === 0} className="px-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↑</button>
                      <button onClick={() => moveQuestion(index, "down")} disabled={index === draft.selectedQuestions.length - 1} className="px-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↓</button>
                      <button onClick={() => removeQuestion(index)} className="px-1 text-red-400 hover:text-red-600">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next step */}
          {stepComplete.questions && (
            <div className="flex justify-end">
              <button
                onClick={() => handleStepClick("resources")}
                className="px-5 py-2.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
              >
                Next: Resources →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── RESOURCES STEP ───────────────────────────────────────────────────── */}
      {activeTab === "resources" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Exam Resources</h2>
            <p className="text-sm text-gray-500 mb-4">
              Optional — upload PDFs, slides, or images students can reference.
            </p>
            <FileResourceUploader
              resources={draft.resources}
              onAdd={(r) => update("resources", [...draft.resources, r])}
              onRemove={(index) =>
                update("resources", draft.resources.filter((_, i) => i !== index))
              }
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => handleStepClick("preview")}
              className="px-5 py-2.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
            >
              Next: Preview →
            </button>
          </div>
        </div>
      )}

      {/* ── PREVIEW STEP ─────────────────────────────────────────────────────── */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          <ExamPreview
            title={draft.title}
            description={draft.description}
            questions={draft.selectedQuestions}
            resources={draft.resources}
            totalMarks={totalMarks}
          />

          {/* Create button — only shown when all steps complete */}
          {stepComplete.settings && stepComplete.questions && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-800">Ready to publish?</p>
                <p className="text-sm text-gray-500">
                  {draft.selectedQuestions.length} questions · {totalMarks} marks ·{" "}
                  <span className={
                    draft.visibility === "PUBLIC" ? "text-green-600" :
                    draft.visibility === "CLASS_ONLY" ? "text-blue-600" :
                    "text-gray-500"
                  }>
                    {draft.visibility.replace("_", " ")}
                  </span>
                </p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition shadow-lg shadow-purple-200"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  "🚀 Create Exam"
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating AI button — always visible */}
      <FloatingAIButton
        context={{
          title: draft.title,
          description: draft.description,
          questions: draft.selectedQuestions,
        }}
        onApplySuggestion={(field, value) => {
          if (field === "title") update("title", value);
          if (field === "description") update("description", value);
        }}
      />
    </div>
  );
}

// ── Settings Panel (extracted for clarity) ──────────────────────────────────
interface SettingsPanelProps {
  draft: DraftState;
  update: <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;
  lessons: Lesson[];
  subjects: Subject[];
  classes: { id: number; name: string }[];
  isComplete: boolean;
  onNext: () => void;
}

function SettingsPanel({ draft, update, lessons, subjects, classes, isComplete, onNext }: SettingsPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <h2 className="font-semibold text-gray-800">Exam Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Title *</label>
          <input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Mathematics End Term Exam"
            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 transition"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Description</label>
          <textarea
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
            placeholder="Optional instructions for students..."
            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 resize-none transition"
          />
        </div>

        {/* Lesson selector */}
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">
            Lesson{" "}
            <span className="text-gray-400 font-normal">(leave blank for a general exam)</span>
          </label>
          <select
            value={draft.lessonId || ""}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              update("lessonId", val);
            }}
            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 transition"
          >
            <option value="">— General / End-term exam (no lesson) —</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} — {l.subject.name} ({l.class.name})
              </option>
            ))}
          </select>
        </div>

        {/* Subject + Class — only when no lesson is selected */}
        {draft.lessonId === 0 && (
          <>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Subject *</label>
              <select
                value={draft.subjectId || ""}
                onChange={(e) => update("subjectId", parseInt(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 transition"
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Class *</label>
              <select
                value={draft.classId || ""}
                onChange={(e) => update("classId", parseInt(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 transition"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Visibility */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Visibility</label>
          <select
            value={draft.visibility}
            onChange={(e) => update("visibility", e.target.value as DraftState["visibility"])}
            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 transition"
          >
            <option value="PRIVATE">🔒 Private — only you</option>
            <option value="CLASS_ONLY">🏫 Class Only — assigned class</option>
            <option value="PUBLIC">🌐 Public — all students</option>
          </select>
        </div>

        {/* Times */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Start Time *</label>
          <input
            type="datetime-local"
            value={draft.startTime}
            onChange={(e) => update("startTime", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 transition"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">End Time *</label>
          <input
            type="datetime-local"
            value={draft.endTime}
            onChange={(e) => update("endTime", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 transition"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button
          onClick={onNext}
          disabled={!isComplete}
          className="px-5 py-2.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition"
        >
          {isComplete ? "Next: Questions →" : "Complete all fields to continue"}
        </button>
      </div>
    </div>
  );
}