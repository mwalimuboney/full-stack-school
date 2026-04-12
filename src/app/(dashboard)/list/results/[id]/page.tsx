import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft, Trophy, Calendar, User, BookOpen, Clock } from "lucide-react";

export default async function SingleResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId) redirect("/sign-in");

  const result = await prisma.result.findUnique({
    where: { id: parseInt(id) },
    include: {
      student: true,
      exam: {
        include: {
          subject: true,
          class: true,
          lesson: { include: { teacher: true, subject: true } },
        },
      },
      assignment: {
        include: {
          lesson: { include: { teacher: true, subject: true } },
        },
      },
    },
  });

  if (!result) notFound();

  const assessment = result.exam || result.assignment;
  const subjectName = result.exam?.subject?.name || assessment?.lesson?.subject?.name || "General";
  const teacherName = assessment?.lesson?.teacher?.name 
    ? `${assessment.lesson.teacher.name} ${assessment.lesson.teacher.surname}`
    : "System Admin";

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link 
          href="/list/results" 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 mb-6 transition-colors"
        >
          <ChevronLeft size={16} /> Back to Results
        </Link>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header Section */}
          <div className="bg-purple-600 p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-purple-100 text-xs font-bold uppercase tracking-widest mb-2">
                  Performance Report
                </p>
                <h1 className="text-3xl font-black">{assessment?.title}</h1>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center min-w-[100px]">
                <p className="text-[10px] uppercase font-bold text-purple-100">Score</p>
                <p className="text-3xl font-black">{result.score}%</p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Student</p>
                  <p className="font-bold text-gray-700">{result.student.name} {result.student.surname}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Subject</p>
                  <p className="font-bold text-gray-700">{subjectName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Date Completed</p>
                  <p className="font-bold text-gray-700">
                    {new Intl.DateTimeFormat("en-GB", { dateStyle: 'long' }).format(result.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Instructor</p>
                  <p className="font-bold text-gray-700">{teacherName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="bg-gray-50 p-6 border-t border-gray-100 flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Clock size={16} />
              <span>Reference ID: {result.id}</span>
            </div>
            {role === "student" && result.score < 50 && (
              <p className="text-red-500 text-sm font-medium">
                Keep practicing! Re-check the course materials to improve.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}