import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import MarkdownRenderer from "@/components/questions/MarkdownRenderer";
import QuestionCard from "@/components/questions/QuestionCard";
import { 
  Clock, 
  ShieldCheck, 
  ChevronLeft, 
  PlayCircle, 
  FileText,
  AlertCircle,
  CalendarDays
} from "lucide-react";
import Link from "next/link";

export default async function SingleExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId) redirect("/sign-in");

  const exam = await prisma.exam.findUnique({
    where: { id: parseInt(id) },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
      lesson: {
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
          teacher: { select: { name: true, surname: true } },
        },
      },
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: {
              choices: true,
              subject: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!exam) notFound();

  
  const isTeacher = role && ["admin", "teacher"].includes(role);
  const totalMarks = exam.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  
  // Date formatting for Kenya (DD/MM/YYYY)
  const formatDate = (date: Date) => 
    new Intl.DateTimeFormat("en-KE", { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
    }).format(date);

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Navigation */}
        <Link 
          href="/list/exams" 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 mb-6 transition-colors group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Exam List
        </Link>

        {/* Exam Header Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="p-6 md:p-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md uppercase tracking-wider border border-purple-100">
                    {exam.subject?.name || exam.lesson?.subject?.name || "General"}
                  </span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md uppercase tracking-wider border border-blue-100">
                     {(exam as any).class?.name || (exam as any).lesson?.class?.name || "Mixed Class"}
                  </span>
                </div>
              
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">
                  {exam.title}
                </h1>
                
                <div className="prose prose-sm text-gray-600 max-w-none bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Instructions</p>
                  <MarkdownRenderer content={exam.description || "No specific instructions provided for this exam."} />
                </div>
              </div>

              {/* Sidebar Info Section */}
              <div className="w-full md:w-72 space-y-4">
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-5">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                        <Clock className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase font-bold">Duration</p>
                      <p className="font-bold text-gray-800">{exam.duration} Minutes</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <FileText className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase font-bold">Weight</p>
                      <p className="font-bold text-gray-800">{exam.questions.length} Items • {totalMarks} Marks</p>
                    </div>
                  </div>

                  {exam.requiresProctoring && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                        <ShieldCheck className="text-indigo-600" size={20} />
                      </div>
                      <div>
                        <p className="text-indigo-600 text-[10px] uppercase font-bold">Security</p>
                        <p className="font-bold text-indigo-700">Proctored Session</p>
                      </div>
                    </div>
                  )}
                </div>

                {!isTeacher && (
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-purple-100 active:scale-[0.98]">
                    <PlayCircle size={22} />
                    Start Assessment
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Availability Status */}
          <div className="bg-slate-900 px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-slate-300 text-xs">
              <CalendarDays size={16} className="text-purple-400" />
              <span>Available: <b className="text-white">{formatDate(exam.startTime)}</b> — <b className="text-white">{formatDate(exam.endTime)}</b></span>
            </div>
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${new Date() < exam.endTime ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                    {new Date() < exam.endTime ? 'Live Now' : 'Closed'}
                </span>
            </div>
          </div>
        </div>

        {/* Questions Preview Section */}
        {isTeacher && (
          <div className="mt-12 space-y-8">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-black text-gray-800">Assessment Content</h2>
              <Link 
                href={`/list/exams/${id}/edit`} 
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
              >
                Modify Questions
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-10">
             {exam.questions.length > 0 ? (
               exam.questions.map((eq, index) => (
                <div key={eq.id} className="group relative">
                  <div className="absolute -left-12 top-0 hidden xl:flex flex-col items-center gap-2">
                    <span className="text-2xl font-black text-slate-200 group-hover:text-purple-200 transition-colors">
                        {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="w-px h-16 bg-slate-100" />
                  </div>
                  
                  <QuestionCard 
                    question={{
                      id: String(eq.question.id),
                      content: eq.question.content,
                      explanation: eq.question.explanation || "",
                      type: eq.question.type,
                      marks: eq.marks || 1,
                      subject: {
                          name: eq.question.subject?.name || exam.subject?.name || "General"
                        },
                        choices: eq.question.choices.map((c) => ({
                        id: String(c.id),
                        content: c.content,
                        isCorrect: c.isCorrect,
                      })),
                    } as any} 
                  />
                </div>
              ))
             ) : (
               <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                  <AlertCircle size={40} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">This exam has no questions yet.</p>
               </div>
             )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
