// src/app/(dashboard)/list/notes/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { ITEM_PER_PAGE } from "@/lib/settings";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import NoteCard from "@/components/notes/NoteCard";
import CreateNoteButton from "@/components/notes/CreateNoteButton";

export default async function NotesListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const [{ userId, sessionClaims }, params] = await Promise.all([
    auth(),
    searchParams,
  ]);

  if (!userId) redirect("/sign-in");

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const { page, search, subjectId, fileType, classId } = params;
  const p = page ? parseInt(page) : 1;

  // Build query
  const where: any = {};

  if (role === "student") {
    where.OR = [{ isPublic: true }, { class: { students: { some: { id: userId } } } }];
  } else if (role === "teacher") {
    where.OR = [{ isPublic: true }, { teacherId: userId }];
  } else if (role === "admin") {

    where.teacherId = null; 
  }

  if (subjectId) where.subjectId = parseInt(subjectId);
  if (classId) where.classId = parseInt(classId);
  if (fileType) where.fileType = fileType;
  if (search) {
    where.AND = [{
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search.toLowerCase() } },
      ],
    }];
  }

  const [notes, count, subjects, userProgressList] = await Promise.all([
    prisma.note.findMany({
      where,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
        aiSummary: { select: { difficulty: true, estimatedReadTime: true } },
        _count: { select: { completedBy: true } },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: { createdAt: "desc" },
    }),
    prisma.note.count({ where }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    // Get user's progress for these notes
    prisma.userProgress.findMany({
      where: { userId },
      select: { noteId: true, progress: true, isLearned: true },
    }),
  ]);

  const progressMap = Object.fromEntries(
    userProgressList.map((p) => [p.noteId, p])
  );

  const FILE_TYPE_ICONS: Record<string, string> = {
    pdf: "📄", docx: "📝", ppt: "📊", video: "🎥",
    youtube: "▶️", audio: "🎵", image: "🖼️", file: "📁",
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Learning Materials</h1>
          <p className="text-xs text-gray-400">{count} resource{count !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <TableSearch />
          {["admin", "teacher"].includes(role ?? "") && (
            <CreateNoteButton subjects={subjects} role={role ?? ""} />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["pdf", "docx", "ppt", "video", "youtube", "audio", "image"].map((type) => (
          <Link
            key={type}
            href={`?fileType=${fileType === type ? "" : type}`}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition ${
              fileType === type
                ? "bg-purple-600 text-white border-purple-600"
                : "border-gray-300 text-gray-500 hover:border-purple-400"
            }`}
          >
            {FILE_TYPE_ICONS[type]} {type.toUpperCase()}
          </Link>
        ))}
      </div>

      {/* Notes grid */}
      {notes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">No learning materials yet</p>
          {["admin", "teacher"].includes(role ?? "") && (
            <p className="text-sm mt-1">Upload your first resource above</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={{
                ...note,
                fileSize: note.fileSize ? Number(note.fileSize) : null,
              }}
              progress={progressMap[note.id] ?? null}
              role={role ?? "student"}
            />
          ))}
        </div>
      )}

      <Pagination page={p} count={count} />
    </div>
  );
}