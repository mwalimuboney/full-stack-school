import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Exam, Prisma, Subject, Teacher } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Plus, ShieldCheck, Clock, Edit } from "lucide-react";

// Updated Type to include the nested relations correctly
type ExamList = Exam & {
  lesson?: {
    subject: { name: string };
    class: { name: string };
    teacher: { name: string; surname: string };
  } | null;
  subject: { name: string } | null;
  class: { name: string } | null;
  teacher: { name: string; surname: string } | null;
  requiresProctoring: boolean;
  duration: number;
};

const ExamListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;
  const resolvedParams = await searchParams;

  const columns = [
    {
      header: "Subject Name",
      accessor: "name",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Status",
      accessor: "status",
      className: "hidden lg:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    ...(role === "admin" || role === "teacher"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: ExamList) => (
    <tr
      key={item.id}
      className="border-b border-gray-100 even:bg-slate-50/50 text-sm hover:bg-purple-50/30 transition-colors"
    >
      <td className="p-4 font-medium text-gray-800"> 
        <Link href={`/list/exams/${item.id}`} className="hover:text-purple-600 hover:underline transition-colors">
        {item.title || item.lesson?.subject?.name || item.subject?.name || "N/A"}
      </Link></td>
      <td className="text-gray-600">{item.lesson?.class?.name || item.class?.name || "N/A"}</td>
      <td className="hidden md:table-cell text-gray-500">
        {item.lesson?.teacher ? `${item.lesson.teacher.name} ${item.lesson.teacher.surname}` : (item.teacher?.name || "Staff")}
      </td>
      <td className="hidden lg:table-cell">
         <div className="flex items-center gap-2">
            {item.requiresProctoring && (
               <span title="Proctored Exam">
                  <ShieldCheck size={14} className="text-blue-500" />
                </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
               new Date(item.endTime) < new Date() 
               ? "bg-gray-100 text-gray-500" 
               : "bg-green-100 text-green-700"
            }`}>
               {new Date(item.endTime) < new Date() ? "Closed" : "Active"}
            </span>
         </div>
      </td>
      <td className="hidden md:table-cell text-gray-500">
        <div className="flex flex-col">
          <span>{new Intl.DateTimeFormat("en-GB").format(item.startTime)}</span>
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Clock size={10} /> {item.duration} mins
          </span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          {(role === "admin" || role === "teacher") && (
            <>
              <Link href={`/list/exams/${item.id}`} className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100">
                 <Edit size={14} />
              </Link>
              <FormContainer table="exam" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = resolvedParams;
  const p = page ? parseInt(page) : 1;

  // QUERY LOGIC
  const query: Prisma.ExamWhereInput = { lesson: {} };

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            (query.lesson as Prisma.LessonWhereInput).classId = parseInt(value);
            break;
          case "teacherId":
            query.lesson!.teacherId = value;
            break;
          case "search":
            query.OR = [
              { lesson: { subject: { name: { contains: value, mode: "insensitive" } } } },
              { subject: { name: { contains: value, mode: "insensitive" } } }
            ];
            break;
        }
      }
    }
  }

  // ROLE FILTERING
  switch (role) {
    case "teacher":
      query.lesson!.teacherId = currentUserId!;
      break;
    case "student":
      query.lesson!.class = { students: { some: { id: currentUserId! } } };
      break;
    case "parent":
      query.lesson!.class = { students: { some: { parentId: currentUserId! } } };
      break;
  }

  const [data, count] = await prisma.$transaction([
    prisma.exam.findMany({
      where: query,
      include: {
        lesson: {
          select: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            class: { select: { name: true } },
          },
        },
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: { startTime: "desc" },
    }),
    prisma.exam.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-6 rounded-xl flex-1 m-4 mt-0 shadow-sm border border-gray-100">
      {/* TOP */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="hidden md:block text-xl font-bold text-gray-800">All Exams</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-3 self-end">
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
              <Image src="/filter.png" alt="Filter" width={16} height={16} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
              <Image src="/sort.png" alt="Sort" width={16} height={16} />
            </button>
            {(role === "admin" || role === "teacher") && (
              <Link 
                href="/list/exams/create"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 shadow-md transition-all active:scale-95"
              >
                <Plus size={18} />
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      
      {/* PAGINATION */}
      <div className="mt-6 border-t border-gray-50 pt-4">
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};

export default ExamListPage;