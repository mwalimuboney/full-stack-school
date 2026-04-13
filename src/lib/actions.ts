"use server";
import { uploadWithFallback, detectFileType, isYouTubeUrl } from "./storage";
import { revalidatePath } from "next/cache";

import {
  ClassSchema,
  ExamSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
  AssignmentSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";

type CurrentState = { success: boolean; error: boolean };


// Optional: Define a schema for strict type safety
export type CreateExamInput = {
  title: string;
  description?: string;
  startTime: string | Date;
  endTime: string | Date;
  visibility: "PUBLIC" | "PRIVATE" | "CLASS_ONLY";
  lessonId?: number;
  questionIds: number[];
  questionMarks?: Record<number, number>;
  durationMinutes?: number;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
  showResultsImmediately?: boolean;
  passingScore?: number;
  maxAttempts?: number;
  isPublic?: boolean;
  requiresProctoring?: boolean;
  classId?: string;
  subjectId?: number;
  
};


// --- FETCH QUESTIONS (The Bank Browser) ---
export type QuestionFilters = {
  subjectId?: number;
  topicId?: number;
  subTopicId?: number;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  subjects?: number[];

};


export type AIValidationResult = {
  available: boolean;
  valid?: boolean;
  issues?: string[];
  suggestions?: string[];
  clarity_score?: number;
  difficulty?: string;
  message?: string;
};



export type AIExamAnalysisResult = {
  available: boolean;
  message?: string;
  overall?: string;
  suggestions?: {
    field: "title" | "description";
    original: string;
    suggested: string;
    reason: string;
  }[];
};



export type NoteInput = {
  title: string;
  description?: string;
  subjectId: number;
  classId?: number;
  isPublic: boolean;
  tags: string[];
  // For file upload
  fileBase64?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  // For external URL (YouTube, Google Drive)
  externalUrl?: string;
  sourceId?: number;
};

export const createNoteAction = async (data: NoteInput) => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!["admin", "teacher"].includes(role ?? "")) {
    return { success: false, error: "Forbidden" };
  }

  try {
    let fileUrl = "";
    let fileType = "file";
    let sourceId: number | undefined;
    let fileSize: number | undefined;
    let thumbnailUrl: string | undefined;

    if (data.externalUrl) {
      // YouTube or external Google Drive link
      fileUrl = data.externalUrl;
      fileType = isYouTubeUrl(data.externalUrl) ? "youtube" : "external";
      // For YouTube, generate thumbnail
      if (fileType === "youtube") {
        const ytId = data.externalUrl.match(
          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        )?.[1];
        if (ytId) thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }
    } else if (data.fileBase64 && data.fileName && data.fileMimeType) {
      // File upload with storage fallback
      const buffer = Buffer.from(data.fileBase64, "base64");
      const result = await uploadWithFallback(
        buffer,
        data.fileName,
        data.fileMimeType,
        data.fileSize ?? buffer.length
      );
      fileUrl = result.url;
      fileType = detectFileType(data.fileMimeType);
      sourceId = result.sourceId;
      fileSize = result.fileSize;
    } else {
      return { success: false, error: "No file or URL provided" };
    }

    const note = await prisma.note.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        fileUrl,
        fileType,
        thumbnailUrl: thumbnailUrl ?? null,
        fileSize: fileSize ? BigInt(fileSize) : null,
        tags: data.tags,
        isPublic: data.isPublic,
        subjectId: data.subjectId,
        classId: data.classId ?? null,
        teacherId: userId,
        sourceId: sourceId ?? null,
      },
    });

    revalidatePath("/list/notes");
    return { success: true, data: note };
  } catch (err) {
    console.error("[createNoteAction]", err);
    return { success: false, error: "Failed to create note" };
  }
};

export const updateNoteAction = async (id: number, data: Partial<NoteInput>) => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!["admin", "teacher"].includes(role ?? "")) {
    return { success: false, error: "Forbidden" };
  }

  // Teachers can only update their own notes
  if (role === "teacher") {
    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing || existing.teacherId !== userId) {
      return { success: false, error: "You can only edit your own notes" };
    }
  }

  try {
    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.tags && { tags: data.tags }),
        ...(data.classId !== undefined && { classId: data.classId }),
      },
    });

    revalidatePath("/list/notes");
    return { success: true, data: note };
  } catch (err) {
    console.error("[updateNoteAction]", err);
    return { success: false, error: "Failed to update note" };
  }
};

export const deleteNoteAction = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  const { userId, sessionClaims } = await auth();

  // Only admins can delete
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") {
    return { success: false, error: true };
  }

  try {
    const note = await prisma.note.findUnique({
      where: { id: parseInt(id) },
      include: { source: true },
    });
    if (!note) return { success: false, error: true };

    await prisma.note.delete({ where: { id: parseInt(id) } });

    // Update source used bytes
    if (note.sourceId && note.fileSize) {
      await prisma.noteSource.update({
        where: { id: note.sourceId },
        data: { usedBytes: { decrement: note.fileSize } },
      });
    }

    revalidatePath("/list/notes");
    return { success: true, error: false };
  } catch (err) {
    console.error("[deleteNoteAction]", err);
    return { success: false, error: true };
  }
};

export const getNotesAction = async (filters: {
  subjectId?: number;
  classId?: number;
  fileType?: string;
  search?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
}) => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const { subjectId, classId, fileType, search, page = 1, limit = 20 } = filters;

  const where: any = {};

  // Role-based visibility
  if (role === "student") {
    where.OR = [{ isPublic: true }, { classId: { not: null } }];
  } else if (role === "teacher") {
    where.OR = [{ isPublic: true }, { teacherId: userId }];
  }
  // admin sees everything

  if (subjectId) where.subjectId = subjectId;
  if (classId) where.classId = classId;
  if (fileType) where.fileType = fileType;
  if (search) {
    where.AND = [
      {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { tags: { has: search.toLowerCase() } },
        ],
      },
    ];
  }

  try {
    const [notes, count] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
          teacher: { select: { name: true, surname: true } },
          aiSummary: { select: { difficulty: true, estimatedReadTime: true } },
          _count: { select: { completedBy: true } },
        },
        take: limit,
        skip: limit * (page - 1),
        orderBy: { createdAt: "desc" },
      }),
      prisma.note.count({ where }),
    ]);

    // Serialize BigInt
    const serialized = notes.map((n) => ({
      ...n,
      fileSize: n.fileSize ? Number(n.fileSize) : null,
    }));

    return { success: true, notes: serialized, count };
  } catch (err) {
    console.error("[getNotesAction]", err);
    return { success: false, error: "Failed to fetch notes" };
  }
};

export const getNoteByIdAction = async (id: number) => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      subject: true,
      class: true,
      teacher: { select: { name: true, surname: true, img: true } },
      aiSummary: true,
      source: { select: { name: true, type: true } },
      _count: { select: { completedBy: true } },
    },
  });

  if (!note) return { success: false, error: "Not found" };

  // Access control
  if (role === "student" && !note.isPublic) {
    const student = await prisma.student.findFirst({
      where: { id: userId, classId: note.classId ?? -1 },
    });
    if (!student) return { success: false, error: "Access denied" };
  }

  // Increment view count
  await prisma.note.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  return {
    success: true,
    note: { ...note, fileSize: note.fileSize ? Number(note.fileSize) : null },
  };
};

// Track learning progress
export const updateProgressAction = async (
  noteId: number,
  progress: number,        // 0-100
  timeSpentSeconds: number
) => {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const updated = await prisma.userProgress.upsert({
      where: { userId_noteId: { userId, noteId } },
      create: {
        userId,
        noteId,
        progress,
        timeSpent: timeSpentSeconds,
        isLearned: progress >= 90,
        sessionCount: 1,
        lastRead: new Date(),
      },
      update: {
        progress: { set: progress },
        timeSpent: { increment: timeSpentSeconds },
        isLearned: progress >= 90,
        sessionCount: { increment: 1 },
        lastRead: new Date(),
      },
    });
    return { success: true, data: updated };
  } catch (err) {
    return { success: false, error: "Failed to update progress" };
  }
};

// Generate AI summary for a note
export const generateAISummaryAction = async (noteId: number, noteTitle: string, noteDescription: string) => {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { success: false, error: "AI not configured" };

  // Check if summary already exists and is fresh (< 7 days)
  const existing = await prisma.noteAISummary.findUnique({ where: { noteId } });
  if (existing) {
    const ageMs = Date.now() - existing.generatedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      return { success: true, data: existing, cached: true };
    }
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // cheapest model to preserve tier
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `Summarize this educational note for students. Return ONLY valid JSON, no markdown.

Title: ${noteTitle}
Description: ${noteDescription || "No description"}

Return:
{
  "summary": "2-3 sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "difficulty": "beginner|intermediate|advanced",
  "estimatedReadTime": 5
}`,
          },
        ],
      }),
    });

    if (response.status === 429) {
      return { success: false, error: "AI rate limit reached" };
    }
    if (!response.ok) {
      return { success: false, error: "AI unavailable" };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    const summary = await prisma.noteAISummary.upsert({
      where: { noteId },
      create: {
        noteId,
        summary: parsed.summary,
        keyPoints: parsed.keyPoints ?? [],
        difficulty: parsed.difficulty ?? "intermediate",
        estimatedReadTime: parsed.estimatedReadTime ?? 5,
        model: "claude-haiku-4-5-20251001",
      },
      update: {
        summary: parsed.summary,
        keyPoints: parsed.keyPoints ?? [],
        difficulty: parsed.difficulty ?? "intermediate",
        estimatedReadTime: parsed.estimatedReadTime ?? 5,
        generatedAt: new Date(),
      },
    });

    return { success: true, data: summary };
  } catch (err) {
    console.error("[generateAISummaryAction]", err);
    return { success: false, error: "AI summary failed" };
  }
};

// Admin: manage external sources
export const createNoteSourceAction = async (data: {
  name: string;
  type: string;
  config: Record<string, string>;
  maxBytes?: number;
  priority?: number;
}) => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") return { success: false, error: "Admin only" };

  try {
    const source = await prisma.noteSource.create({
      data: {
        name: data.name,
        type: data.type as any,
        config: data.config,
        maxBytes: data.maxBytes ? BigInt(data.maxBytes) : null,
        priority: data.priority ?? 0,
      },
    });
    return { success: true, data: { ...source, maxBytes: source.maxBytes ? Number(source.maxBytes) : null, usedBytes: Number(source.usedBytes) } };
  } catch (err) {
    return { success: false, error: "Failed to create source" };
  }
};

export const analyzeExamAI = async (context: {
  title: string;
  description: string;
  questions: {
    content: string;
    type: string;
    choices: { content: string; isCorrect: boolean }[];
  }[];
}): Promise<AIExamAnalysisResult> => {
  const { userId } = await auth();
  if (!userId) return { available: false, message: "Unauthorized" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { available: false, message: "AI features are not configured." };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `You are an educational exam quality reviewer. Analyze this exam and return ONLY valid JSON — no markdown, no backticks, no extra text.

Exam title: ${context.title || "(empty)"}
Description: ${context.description || "(empty)"}
Number of questions: ${context.questions.length}

Return this exact JSON:
{
  "overall": "one sentence assessment",
  "suggestions": [
    {
      "field": "title",
      "original": "exact current title",
      "suggested": "improved version",
      "reason": "why this is better (max 20 words)"
    }
  ]
}

Only include a suggestion if there is a real improvement. Max 3 suggestions. Fields can only be "title" or "description".`,
          },
        ],
      }),
    });

    if (response.status === 429) {
      return {
        available: false,
        message: "AI rate limit reached. Exam creation is not affected.",
      };
    }

    if (!response.ok) {
      return { available: false, message: "AI temporarily unavailable." };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "{}";

    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      return { available: true, ...parsed };
    } catch {
      return { available: false, message: "AI response could not be parsed." };
    }
  } catch (err) {
    console.error("AI_EXAM_ANALYSIS_ERROR:", err);
    return { available: false, message: "AI service unreachable." };
  }
};


export const validateQuestionAI = async (
  question: string,
  type: string,
  choices?: any[]
): Promise<AIValidationResult> => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { available: false, message: "AI features are not configured." };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620", // or your preferred model
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `You are an educational content validator. Analyze this exam question and respond ONLY with valid JSON.

Question: ${question}
Type: ${type}
${choices ? `Choices: ${JSON.stringify(choices)}` : ""}

Respond with this exact JSON structure:
{
  "valid": true,
  "issues": ["issue1"],
  "suggestions": ["suggestion1"],
  "clarity_score": 8,
  "difficulty": "medium"
}

Check for: clarity, grammar, ambiguity, correct answer validity, distractor quality (for MCQ).`,
          },
        ],
      }),
    });

    if (response.status === 429) {
      return { available: false, message: "AI rate limit reached." };
    }

    if (!response.ok) {
      return { available: false, message: "AI service error." };
    }

    const data = await response.json();
    const text = data.content[0]?.text ?? "{}";

    try {
      const result = JSON.parse(text);
      return { available: true, ...result };
    } catch {
      return { available: false, message: "AI failed to format its response." };
    }
  } catch (err) {
    console.error("AI_VALIDATION_ERROR:", err);
    return { available: false, message: "AI unreachable." };
  }
};


export const getQuestionsAction = async (filters: QuestionFilters) => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!["admin", "teacher"].includes(role ?? "")) return { success: false, error: "Forbidden" };

  const { subjectId, topicId, subTopicId, type, search, page = 1, limit = 20 } = filters;

  const where: any = {};
  if (subjectId) where.subjectId = subjectId;
  if (topicId) where.topicId = topicId;
  if (subTopicId) where.subTopicId = subTopicId;
  if (type) where.type = type;
  if (search) where.content = { contains: search, mode: "insensitive" };

  try {
    const [questions, count] = await Promise.all([
      prisma.question.findMany({
        where,
        include: { choices: true, subject: true, topic: true, subTopic: true },
        take: limit,
        skip: limit * (page - 1),
        orderBy: { createdAt: "desc" },
      }),
      prisma.question.count({ where }),
    ]);

    return { success: true, questions, count };
  } catch (err) {
    return { success: false, error: "Failed to fetch questions" };
  }
};

// --- CREATE QUESTION ---
export const createQuestionAction = async (data: any) => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { success: false, error: "Unauthorized" };

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!["admin", "teacher"].includes(role ?? "")) return { success: false, error: "Forbidden" };

  try {
    const question = await prisma.question.create({
      data: {
        content: data.content,
        type: data.type,
        marks: data.marks ?? 1,
        explanation: data.explanation,
        imageUrl: data.imageUrl,
        subjectId: data.subjectId,
        topicId: data.topicId ?? null,
        subTopicId: data.subTopicId ?? null,
        createdById: userId,
        choices: data.choices
          ? {
              create: data.choices.map((c: any) => ({
                content: c.content,
                isCorrect: c.isCorrect,
                imageUrl: c.imageUrl ?? null,
              })),
            }
          : undefined,
      },
      include: { choices: true },
    });

    revalidatePath("/list/questions");
    return { success: true, data: question };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to create question" };
  }
};


export const bulkCreateQuestionsAction = async (questions: any[]) => {
  const { userId, sessionClaims } = await auth();
  
  // 1. Auth & Role Validation
  if (!userId) return { success: false, error: "Unauthorized" };
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!["admin", "teacher"].includes(role ?? "")) return { success: false, error: "Forbidden" };

  // 2. Input Validation
  if (!Array.isArray(questions) || questions.length === 0) {
    return { success: false, error: "No questions provided." };
  }
  if (questions.length > 100) {
    return { success: false, error: "Maximum 100 questions per upload." };
  }

  try {
    // 3. Database Transaction (Atomic Operation)
    const result = await prisma.$transaction(async (tx) => {
      const createdQuestions = await Promise.all(
        questions.map((q) =>
          tx.question.create({
            data: {
              content: q.content,
              type: q.type,
              marks: q.marks ?? 1,
              explanation: q.explanation,
              imageUrl: q.imageUrl ?? null,
              subjectId: q.subjectId,
              topicId: q.topicId ?? null,
              subTopicId: q.subTopicId ?? null,
              createdById: userId,
              choices: q.choices
                ? {
                    create: q.choices.map((c: any) => ({
                      content: c.content,
                      isCorrect: c.isCorrect,
                      imageUrl: c.imageUrl ?? null,
                    })),
                  }
                : undefined,
            },
          })
        )
      );
      return createdQuestions;
    });

    revalidatePath("/list/questions");
    return { success: true, count: result.length };
  } catch (err) {
    console.error("BULK_UPLOAD_ERROR:", err);
    return { success: false, error: "Bulk upload failed. Please check your data formatting." };
  }
};

export const createExamAction = async (data: CreateExamInput) => {
  const { userId, sessionClaims } = await auth();
  
  if (!userId) return { success: false, error: "Unauthorized" };

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  
  let teacherIdToAssign: string | null = null;


  if (role === "admin") {
   
    const firstTeacher = await prisma.teacher.findFirst(); 
    teacherIdToAssign = firstTeacher?.id || null;
  } else if (role === "teacher") {
    // Teachers use their own ID
    const teacher = await prisma.teacher.findUnique({ where: { id: userId } });
    if (!teacher) return { success: false, error: "Teacher record not found." };
    teacherIdToAssign = teacher.id;
  }

  try {
    // 3. Database Operation
   
    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),

        // Settings Mapping
        duration: data.durationMinutes,
        shuffleQuestions: data.shuffleQuestions,
        shuffleChoices: data.shuffleChoices,
        showResults: data.showResultsImmediately,
        passingScore: data.passingScore,
        maxAttempts: data.maxAttempts,
        isPublic: data.isPublic,
        requiresProctoring: data.requiresProctoring,

        lessonId: (data.lessonId ? Number(data.lessonId) : undefined) as any,
        subjectId: data.subjectId ? Number(data.subjectId) : null,
        classId: data.classId ? parseInt(data.classId) : null,
        teacherId: teacherIdToAssign, 

        visibility: data.visibility ?? "PRIVATE",
       
        questions: {
          create: data.questionIds.map((qId: number, index: number) => ({
            questionId: qId,
            order: index + 1,
            marks: data.questionMarks?.[qId] ?? 1,
          })),
        },
      },
    });

    // 4. Cache Management
    // Using revalidatePath is usually more reliable than revalidateTag for UI updates
    revalidatePath("/list/exams");
    
    return { success: true, data: exam };
  } catch (err) {
    console.error("EXAM_CREATE_ERROR:", err);
    return { success: false, error: "Failed to create exam. Please check your data." };
  }
};


export const sendMessage = async (formData: FormData) => {
  const { userId } = await auth();
  const text = formData.get("text") as string;
  const receiverId = formData.get("receiverId") as string;

  if (!text || !userId) return;

  await prisma.message.create({
    data: {
      text,
      senderId: userId,
      receiverId: receiverId,
    },
  });

  revalidatePath(`/list/messages/${receiverId}`);
};

export const updateAttendance = async (
  lessonId: number,
  date: Date,
  attendanceData: { studentId: string; present: boolean }[]
) => {
  try {
    // We use a transaction to ensure all records are saved together
    await prisma.$transaction(
      attendanceData.map((item) =>
        prisma.attendance.upsert({
          where: {
            // This assumes you have a unique constraint or you query by specific ID
            // If no unique constraint exists, we use updateMany or delete/create
            id: -1, // Placeholder for upsert logic if you don't have the record ID
          },
          create: {
            date,
            present: item.present,
            studentId: item.studentId,
            lessonId,
          },
          update: {
            present: item.present,
          },
        })
      )
    );

    revalidatePath("/list/attendance");
    return { success: true, error: false };
  } catch (err) {
    console.error(err);
    return { success: false, error: true };
  }
};

// ─── SUBJECTS ────────────────────────────────────────────────────────────────

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });
    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.error("[createSubject]", err);
    return { success: false, error: true };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });
    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.error("[updateSubject]", err);
    return { success: false, error: true };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.subject.delete({ where: { id: parseInt(id) } });
    revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.error("[deleteSubject]", err);
    return { success: false, error: true };
  }
};

// ─── CLASSES ─────────────────────────────────────────────────────────────────

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    await prisma.class.create({ data });
    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.error("[createClass]", err);
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    await prisma.class.update({ where: { id: data.id }, data });
    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.error("[updateClass]", err);
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.class.delete({ where: { id: parseInt(id) } });
    revalidatePath("/list/classes");
    return { success: true, error: false };
  } catch (err) {
    console.error("[deleteClass]", err);
    return { success: false, error: true };
  }
};

// ─── TEACHERS ────────────────────────────────────────────────────────────────

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    const client = await clerkClient();
    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      emailAddress: [data.email!],
      publicMetadata: { role: "teacher" },
    });

    try {
      await prisma.teacher.create({
        data: {
          id: user.id,
          username: data.username,
          name: data.name,
          surname: data.surname,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address,
          img: data.img || null,
          bloodType: data.bloodType,
          sex: data.sex,
          birthday: data.birthday,
          subjects: {
            connect: data.subjects?.map((subjectId: string) => ({
              id: parseInt(subjectId),
            })),
          },
        },
      });
      revalidatePath("/list/teachers");
      return { success: true, error: false };
    } catch (dbErr) {
      // Rollback: delete Clerk user if DB insert fails
      await client.users.deleteUser(user.id);
      console.error("[createTeacher] DB error, rolled back Clerk user:", dbErr);
      return { success: false, error: true };
    }
  } catch (err) {
    console.error("[createTeacher] Clerk error:", err);
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) return { success: false, error: true };
  try {
    const client = await clerkClient();
    await client.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.teacher.update({
      where: { id: data.id },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });
    revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.error("[updateTeacher]", err);
    return { success: false, error: true };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const client = await clerkClient();
    await client.users.deleteUser(id);
    await prisma.teacher.delete({ where: { id } });
    revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.error("[deleteTeacher]", err);
    return { success: false, error: true };
  }
};

// ─── STUDENTS ────────────────────────────────────────────────────────────────

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    // Check class capacity before creating anything
    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      console.error("[createStudent] Class is full");
      return { success: false, error: true };
    }

    const client = await clerkClient();
    const user = await client.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "student" },
    });

    try {
      await prisma.student.create({
        data: {
          id: user.id,
          username: data.username,
          name: data.name,
          surname: data.surname,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address,
          img: data.img || null,
          bloodType: data.bloodType,
          sex: data.sex,
          birthday: data.birthday,
          gradeId: data.gradeId,
          classId: data.classId,
          parentId: data.parentId,
        },
      });
      revalidatePath("/list/students");
      return { success: true, error: false };
    } catch (dbErr) {
      // Rollback: delete Clerk user if DB insert fails
      await client.users.deleteUser(user.id);
      console.error("[createStudent] DB error, rolled back Clerk user:", dbErr);
      return { success: false, error: true };
    }
  } catch (err) {
    console.error("[createStudent] Clerk error:", err);
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) return { success: false, error: true };
  try {
    const client = await clerkClient();
    await client.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.student.update({
      where: { id: data.id },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
      },
    });
    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.error("[updateStudent]", err);
    return { success: false, error: true };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const client = await clerkClient();
    await client.users.deleteUser(id);
    await prisma.student.delete({ where: { id } });
    revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.error("[deleteStudent]", err);
    return { success: false, error: true };
  }
};

// ─── EXAMS ───────────────────────────────────────────────────────────────────

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // Teachers can only create exams for their own lessons
    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: { teacherId: userId!, id: data.lessonId },
      });
      if (!teacherLesson) return { success: false, error: true };
    }

    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });
    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.error("[createExam]", err);
    return { success: false, error: true };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // Teachers can only update exams for their own lessons
    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: { teacherId: userId!, id: data.lessonId },
      });
      if (!teacherLesson) return { success: false, error: true };
    }

    await prisma.exam.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });
    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.error("[updateExam]", err);
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.exam.delete({
      where: {
        id: parseInt(id),
        // Teachers can only delete their own exams
        ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });
    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    console.error("[deleteExam]", err);
    return { success: false, error: true };
  }
};

// ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // Teachers can only create assignments for their own lessons
    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: { teacherId: userId!, id: data.lessonId },
      });
      if (!teacherLesson) return { success: false, error: true };
    }

    await prisma.assignment.create({
      data: {
        title: data.title,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
      },
    });
    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.error("[createAssignment]", err);
    return { success: false, error: true };
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  if (!data.id) return { success: false, error: true };

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    if (role === "teacher") {
      const teacherLesson = await prisma.lesson.findFirst({
        where: { teacherId: userId!, id: data.lessonId },
      });
      if (!teacherLesson) return { success: false, error: true };
    }

    await prisma.assignment.update({
      where: { id: data.id },
      data: {
        title: data.title,
        dueDate: new Date(data.dueDate),
        lessonId: data.lessonId,
      },
    });
    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.error("[updateAssignment]", err);
    return { success: false, error: true };
  }
};

export const deleteAssignment = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.assignment.delete({
      where: {
        id: parseInt(id),
        ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });
    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.error("[deleteAssignment]", err);
    return { success: false, error: true };
  }
};


