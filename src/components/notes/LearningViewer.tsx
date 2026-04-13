// src/components/notes/LearningViewer.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { updateProgressAction, generateAISummaryAction } from "@/lib/actions";
import MarkdownRenderer from "../questions/MarkdownRenderer";
import Link from "next/link";

interface Note {
  id: number;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileType: string;
  fileSize?: number | bigint | null;
  thumbnailUrl?: string | null;
  subject: { name: string };
  class?: { name: string } | null;
  teacher?: { name: string; surname: string; img?: string | null } | null;
  aiSummary?: {
    summary: string;
    keyPoints: string[];
    difficulty: string;
    estimatedReadTime: number;
  } | null;
  viewCount: number;
}

interface Progress {
  progress: number;
  isLearned: boolean;
  timeSpent: number;
  sessionCount: number;
}

interface Props {
  note: Note;
  initialProgress: Progress | null;
  userId: string;
  role: string;
}

const DIFFICULTY_BADGE: Record<string, string> = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-700",
};

export default function LearningViewer({ note, initialProgress, userId, role }: Props) {
  const [progress, setProgress] = useState(initialProgress?.progress ?? 0);
  const [isLearned, setIsLearned] = useState(initialProgress?.isLearned ?? false);
  const [aiSummary, setAiSummary] = useState(note.aiSummary);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [sessionStart] = useState(Date.now());
  const lastSavedProgress = useRef(progress);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Save progress debounced
  const saveProgress = useCallback(async (newProgress: number) => {
    if (Math.abs(newProgress - lastSavedProgress.current) < 5) return; // only save if changed by 5%
    lastSavedProgress.current = newProgress;

    const timeSpent = Math.floor((Date.now() - sessionStart) / 1000);
    await updateProgressAction(note.id, newProgress, timeSpent);

    if (newProgress >= 90) setIsLearned(true);
  }, [note.id, sessionStart]);

  const debouncedSave = useCallback((newProgress: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveProgress(newProgress), 2000);
  }, [saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const timeSpent = Math.floor((Date.now() - sessionStart) / 1000);
      updateProgressAction(note.id, lastSavedProgress.current, timeSpent);
    };
  }, [note.id, sessionStart]);

  const handleManualComplete = async () => {
    setProgress(100);
    setIsLearned(true);
    await updateProgressAction(note.id, 100, Math.floor((Date.now() - sessionStart) / 1000));
  };

  const loadAISummary = async () => {
    if (aiSummary) { setShowAI(true); return; }
    setAiLoading(true);
    setAiError("");
    const result = await generateAISummaryAction(note.id, note.title, note.description ?? "");
    if (result.success && result.data) {
      setAiSummary(result.data as any);
      setShowAI(true);
    } else {
      setAiError(result.error ?? "AI unavailable");
    }
    setAiLoading(false);
  };

  const isYouTube = note.fileType === "youtube";
  const isPDF = note.fileType === "pdf";
  const isVideo = note.fileType === "video";
  const isAudio = note.fileType === "audio";
  const isImage = note.fileType === "image";
  const isOffice = ["docx", "ppt"].includes(note.fileType);

  const getYouTubeId = (url: string) =>
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)?.[1];

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen bg-gray-50">
      {/* Main viewer */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/list/notes"
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              ←
            </Link>
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-800 truncate">{note.title}</h1>
              <p className="text-xs text-gray-400">
                {note.subject.name}
                {note.class && ` · ${note.class.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* AI Summary button */}
            <button
              onClick={loadAISummary}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition disabled:opacity-50"
            >
              {aiLoading ? (
                <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                "✨"
              )}
              AI Summary
            </button>

            {/* Mark complete */}
            {!isLearned && (
              <button
                onClick={handleManualComplete}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                ✓ Mark Complete
              </button>
            )}

            {isLearned && (
              <span className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg font-medium">
                ✓ Completed
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {/* YouTube embed */}
          {isYouTube && (() => {
            const ytId = getYouTubeId(note.fileUrl);
            return ytId ? (
              <div className="aspect-video w-full max-w-5xl mx-auto mt-4 px-4">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                  className="w-full h-full rounded-xl"
                  allowFullScreen
                  title={note.title}
                  onLoad={() => { setProgress(10); debouncedSave(10); }}
                />
              </div>
            ) : (
              <div className="p-8 text-center text-red-500">Invalid YouTube URL</div>
            );
          })()}

          {/* PDF */}
          {isPDF && (
            <div className="h-[calc(100vh-120px)] p-4">
              <iframe
                src={`${note.fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full rounded-xl border border-gray-200"
                title={note.title}
                onLoad={() => { setProgress((p) => Math.max(p, 10)); debouncedSave(10); }}
              />
            </div>
          )}

          {/* Video */}
          {isVideo && (
            <div className="max-w-5xl mx-auto p-4">
              <video
                controls
                className="w-full rounded-xl border border-gray-200"
                onPlay={() => { setProgress((p) => Math.max(p, 5)); }}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration) {
                    const pct = Math.floor((v.currentTime / v.duration) * 100);
                    setProgress(pct);
                    debouncedSave(pct);
                  }
                }}
                onEnded={() => { setProgress(100); setIsLearned(true); saveProgress(100); }}
              >
                <source src={note.fileUrl} />
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {/* Audio */}
          {isAudio && (
            <div className="max-w-2xl mx-auto p-8 text-center space-y-6">
              <div className="text-8xl">🎵</div>
              <h2 className="text-xl font-semibold">{note.title}</h2>
              <audio
                controls
                className="w-full"
                onTimeUpdate={(e) => {
                  const a = e.currentTarget;
                  if (a.duration) {
                    const pct = Math.floor((a.currentTime / a.duration) * 100);
                    setProgress(pct);
                    debouncedSave(pct);
                  }
                }}
                onEnded={() => { setProgress(100); setIsLearned(true); saveProgress(100); }}
              >
                <source src={note.fileUrl} />
              </audio>
            </div>
          )}

          {/* Image */}
          {isImage && (
            <div className="flex justify-center p-4">
              <img
                src={note.fileUrl}
                alt={note.title}
                className="max-w-full max-h-[80vh] object-contain rounded-xl border border-gray-200"
                onLoad={() => { setProgress(100); debouncedSave(100); }}
              />
            </div>
          )}

          {/* Office docs via Microsoft viewer */}
          {isOffice && (
            <div className="h-[calc(100vh-120px)] p-4">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(note.fileUrl)}`}
                className="w-full h-full rounded-xl border border-gray-200"
                title={note.title}
                onLoad={() => { setProgress((p) => Math.max(p, 10)); debouncedSave(10); }}
              />
            </div>
          )}

          {/* Other files — download prompt */}
          {!isYouTube && !isPDF && !isVideo && !isAudio && !isImage && !isOffice && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500">
              <span className="text-6xl">📁</span>
              <p className="font-medium">{note.title}</p>
              <a
                href={note.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { setProgress(100); saveProgress(100); }}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
              >
                Download & View
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l flex flex-col">
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Note info */}
          <div className="space-y-2">
            <h2 className="font-semibold text-gray-800">{note.title}</h2>
            {note.description && (
              <p className="text-sm text-gray-500">{note.description}</p>
            )}
            {note.teacher && (
              <p className="text-xs text-gray-400">
                By {note.teacher.name} {note.teacher.surname}
              </p>
            )}
          </div>

          {/* Progress card */}
          <div className="bg-purple-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-purple-700">Your Progress</span>
              <span className="font-bold text-purple-700">{progress}%</span>
            </div>
            <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {isLearned && (
              <p className="text-xs text-green-600 font-medium">✓ Marked as learned!</p>
            )}
          </div>

          {/* AI Summary */}
          {aiError && (
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-100">
              ⚠️ {aiError} — AI unavailable, content is still accessible.
            </div>
          )}

          {showAI && aiSummary && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-700">✨ AI Summary</h3>
                <div className="flex gap-2">
                  {aiSummary.difficulty && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_BADGE[aiSummary.difficulty] ?? ""}`}>
                      {aiSummary.difficulty}
                    </span>
                  )}
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    ~{aiSummary.estimatedReadTime}min
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">
                {aiSummary.summary}
              </p>
              {aiSummary.keyPoints.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Key Points</p>
                  <ul className="space-y-1.5">
                    {aiSummary.keyPoints.map((point, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-purple-500 flex-shrink-0">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-lg font-bold text-gray-700">{note.viewCount}</p>
              <p className="text-[10px] text-gray-400">Total views</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-lg font-bold text-gray-700">
                {Math.floor((Date.now() - sessionStart) / 60000)}m
              </p>
              <p className="text-[10px] text-gray-400">This session</p>
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="p-4 border-t">
          <Link
            href="/list/notes"
            className="block w-full text-center py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            ← Back to Resources
          </Link>
        </div>
      </div>
    </div>
  );
}