// src/app/(dashboard)/learn/[id]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import LearningViewer from "@/components/notes/LearningViewer";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, { userId, sessionClaims }] = await Promise.all([
    params,
    auth(),
  ]);

  if (!userId) redirect("/sign-in");

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const noteId = parseInt(id);

  const [note, userProgress] = await Promise.all([
    prisma.note.findUnique({
      where: { id: noteId },
      include: {
        subject: true,
        class: true,
        teacher: { select: { name: true, surname: true, img: true } },
        aiSummary: true,
        source: { select: { name: true, type: true } },
      },
    }),
    prisma.userProgress.findUnique({
      where: { userId_noteId: { userId, noteId } },
    }),
  ]);

  if (!note) return notFound();

  // Access control
  if (role === "student" && !note.isPublic) {
    const student = await prisma.student.findFirst({
      where: { id: userId, classId: note.classId ?? -1 },
    });
    if (!student) redirect("/list/notes");
  }

  // Increment view count
  await prisma.note.update({
    where: { id: noteId },
    data: { viewCount: { increment: 1 } },
  });

  return (
    <LearningViewer
      note={{
        ...note,
        fileSize: note.fileSize ? Number(note.fileSize) : null,
      }}
      initialProgress={userProgress ?? null}
      userId={userId}
      role={role ?? "student"}
    />
  );
}