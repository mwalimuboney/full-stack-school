import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import MarkdownRenderer from "@/components/questions/MarkdownRenderer";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import { Plus, Filter } from "lucide-react";

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const [{ sessionClaims, userId }, resolvedParams] = await Promise.all([
    auth(),
    searchParams,
  ]);

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || !["admin", "teacher"].includes(role ?? "")) redirect("/sign-in");

  const { page, subjectId, type, search } = resolvedParams;
  const p = page ? parseInt(page) : 1;

  // URL-based filtering logic
  const where: any = {};
  if (subjectId) where.subjectId = parseInt(subjectId);
  if (type) where.type = type;
  if (search) {
    where.content = { contains: search, mode: "insensitive" };
  }

  const [questions, count, subjects] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        subject: true,
        topic: true,
        subTopic: true,
        choices: true,
        _count: { select: { examQuestions: true } },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: { createdAt: "desc" },
    }),
    prisma.question.count({ where }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="bg-white p-6 rounded-xl flex-1 m-4 mt-0 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Question Bank</h1>
          <p className="text-sm text-gray-500">Manage and reuse {count} questions across exams</p>
        </div>
        <Link 
          href="/list/questions/create" 
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md active:scale-95"
        >
          <Plus size={18} />
          Create Question
        </Link>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-gray-50 p-4 rounded-lg">
        <div className="w-full md:w-auto">
          <TableSearch />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-gray-400 mr-2" />
          
          {/* Note: In a full implementation, these would be a Client Component to handle onChange */}
          <select
            defaultValue={subjectId ?? ""}
            className="flex-1 md:w-40 p-2 text-xs border border-gray-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-100 transition-all"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            defaultValue={type ?? ""}
            className="flex-1 md:w-40 p-2 text-xs border border-gray-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-purple-100 transition-all"
          >
            <option value="">All Types</option>
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="MULTIPLE_SELECT">Multiple Select</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="LONG_ANSWER">Long Answer</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="grid grid-cols-1 gap-4">
        {questions.length > 0 ? (
          questions.map((q) => (
            <div
              key={q.id}
              className="group border border-gray-100 rounded-xl p-5 hover:border-purple-200 hover:shadow-sm transition-all bg-white relative"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="mb-3">
                    <MarkdownRenderer content={q.content} />
                  </div>
                  
                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                      {q.subject.name}
                    </span>
                    {q.topic && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                        {q.topic.name}
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-600 border border-gray-200 italic">
                      {q.type.replace(/_/g, " ")}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                      {q.marks} PTS
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      q._count.examQuestions > 0 
                        ? "bg-green-50 text-green-700 border-green-100" 
                        : "bg-gray-50 text-gray-400 border-gray-100"
                    }`}>
                      {q._count.examQuestions === 0 ? "Unused" : `Used in ${q._count.examQuestions} Exam(s)`}
                    </span>
                  </div>

                  {/* MCQ Preview */}
                  {q.choices.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 border-t border-gray-50 pt-4">
                      {q.choices.map((c, ci) => (
                        <div
                          key={c.id}
                          className={`text-xs flex items-center gap-2 p-1.5 rounded-md ${
                            c.isCorrect ? "bg-green-50 text-green-800 font-semibold" : "text-gray-500"
                          }`}
                        >
                          <span className="bg-white border border-current rounded w-5 h-5 flex items-center justify-center text-[10px]">
                            {String.fromCharCode(65 + ci)}
                          </span>
                          <span className="truncate">{c.content}</span>
                          {c.isCorrect && <span className="ml-auto text-[10px]">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Button - Visible on hover */}
                <Link 
                  href={`/list/questions/${q.id}`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-400">No questions found matching your criteria.</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
}