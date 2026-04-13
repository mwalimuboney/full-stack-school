// src/components/notes/NoteCard.tsx
import Link from "next/link";
import Image from "next/image";

interface NoteCardProps {
  note: {
    id: number;
    title: string;
    description?: string | null;
    fileType: string;
    thumbnailUrl?: string | null;
    fileSize?: number | null;
    viewCount: number;
    isPublic: boolean;
    tags: string[];
    subject: { name: string };
    class?: { name: string } | null;
    teacher?: { name: string; surname: string } | null;
    aiSummary?: { difficulty: string; estimatedReadTime: number } | null;
    _count: { completedBy: number };
  };
  progress?: { progress: number; isLearned: boolean } | null;
  role: string;
}

const FILE_COLORS: Record<string, string> = {
  pdf: "bg-red-50 text-red-600 border-red-100",
  docx: "bg-blue-50 text-blue-600 border-blue-100",
  ppt: "bg-orange-50 text-orange-600 border-orange-100",
  video: "bg-purple-50 text-purple-600 border-purple-100",
  youtube: "bg-red-50 text-red-600 border-red-100",
  audio: "bg-green-50 text-green-600 border-green-100",
  image: "bg-yellow-50 text-yellow-600 border-yellow-100",
  file: "bg-gray-50 text-gray-600 border-gray-100",
};

const FILE_ICONS: Record<string, string> = {
  pdf: "📄", docx: "📝", ppt: "📊", video: "🎥",
  youtube: "▶️", audio: "🎵", image: "🖼️", file: "📁",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-green-600 bg-green-50",
  intermediate: "text-yellow-600 bg-yellow-50",
  advanced: "text-red-600 bg-red-50",
};

export default function NoteCard({ note, progress, role }: NoteCardProps) {
  const colorClass = FILE_COLORS[note.fileType] ?? FILE_COLORS.file;
  const icon = FILE_ICONS[note.fileType] ?? "📁";
  const progressPct = progress?.progress ?? 0;
  const isLearned = progress?.isLearned ?? false;

  return (
    <div className="group border border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 hover:shadow-md transition-all duration-200">
      {/* Thumbnail or icon */}
      <div className={`relative h-36 flex items-center justify-center border-b ${colorClass}`}>
        {note.thumbnailUrl ? (
          <Image
            src={note.thumbnailUrl}
            alt={note.title}
            fill
            className="object-cover"
          />
        ) : (
          <span className="text-5xl">{icon}</span>
        )}

        {/* Learned badge */}
        {isLearned && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            ✓ Learned
          </div>
        )}

        {/* Visibility badge */}
        {!note.isPublic && (
          <div className="absolute top-2 left-2 bg-gray-800/70 text-white text-[10px] px-2 py-0.5 rounded-full">
            🔒 Private
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-semibold text-sm text-gray-800 line-clamp-1 group-hover:text-purple-700 transition">
            {note.title}
          </h3>
          {note.description && (
            <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{note.description}</p>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
            {note.subject.name}
          </span>
          {note.class && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {note.class.name}
            </span>
          )}
          {note.aiSummary && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[note.aiSummary.difficulty] ?? ""}`}>
              {note.aiSummary.difficulty}
            </span>
          )}
          {note.aiSummary && (
            <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">
              ~{note.aiSummary.estimatedReadTime}min
            </span>
          )}
        </div>

        {/* Progress bar */}
        {progressPct > 0 && (
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span>👁 {note.viewCount} views</span>
          <span>✓ {note._count.completedBy} learned</span>
        </div>

        {/* Action */}
        <Link
          href={`/learn/${note.id}`}
          className="block w-full text-center py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition"
        >
          {progressPct > 0 ? "Continue Learning" : "Start Learning"}
        </Link>
      </div>
    </div>
  );
}