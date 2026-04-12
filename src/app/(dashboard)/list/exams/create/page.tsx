import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ExamCreator from "@/components/exams/ExamCreator";

export default async function CreateExamPage() {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // 1. Guard the route
  if (!userId || !["admin", "teacher"].includes(role ?? "")) {
    redirect("/sign-in");
  }


  const [subjects, lessons, classes] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        topics: {
          orderBy: { name: "asc" },
          include: { 
            subTopics: {
              orderBy: { name: "asc" }
            } 
          },
        },
      },
    }),
    prisma.lesson.findMany({
      // If a teacher, only show their lessons. If admin, show all.
      where: role === "teacher" ? { teacherId: userId } : {},
      include: { 
        subject: true, 
        class: true 
      },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({ 
      orderBy: { name: "asc" } 
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumbs or Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-medium text-purple-600 uppercase tracking-widest mb-2">
            <span>Dashboard</span>
            <span>/</span>
            <span>Exams</span>
            <span>/</span>
            <span className="text-gray-400">New Exam</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Create New Exam
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl leading-relaxed">
            Configure your assessment settings, set proctoring rules, and select 
            questions from your subject library.
          </p>
        </div>

        {/* Main Interface */}
        <div className="bg-transparent">
          <ExamCreator
            subjects={subjects}
            lessons={lessons}
            classes={classes}
            role={role ?? "teacher"}
          />
        </div>
      </div>
    </div>
  );
}