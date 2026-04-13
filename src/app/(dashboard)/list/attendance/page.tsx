import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Attendance, Prisma, Student, Lesson, Subject, Class } from "@prisma/client";
import Image from "next/image";
import { z } from "zod";

// Defining the complex type for our include query
type AttendanceList = Attendance & { 
  student: Student; 
  lesson: Lesson & { 
    subject: Subject; 
    class: Class 
  } 
};

const AttendanceListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {

  const querySchema = z.object({
    page: z.string().optional(),
    classId: z.string().optional(),
    search: z.string().optional(),
  });

  const resolvedSearchParams = await searchParams;
  const parsed = querySchema.safeParse(resolvedSearchParams);

  if (!parsed.success) {
    throw new Error("Invalid query params");
  }

  const { page, ...queryParams } =  parsed.data;
  const p = page ? parseInt(page as string) : 1;


  // 1. URL Query Logic (Filters)
  const query: Prisma.AttendanceWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.lesson = { classId: parseInt(value as string) };
            break;
          case "search":
            query.student = { name: { contains: value as string, mode: "insensitive" } };
            break;
          default:
            break;
        }
      }
    }
  }

  // 2. Optimized Data Fetching
  const [data, count] = await prisma.$transaction([
    prisma.attendance.findMany({
      where: query,
      include: {
        student: true,
        lesson: {
          include: {
            subject: true,
            class: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.attendance.count({ where: query }),
  ]);

  const columns = [
    { header: "Student", accessor: "student" },
    { header: "Class", accessor: "class", className: "hidden md:table-cell" },
    { header: "Subject", accessor: "subject", className: "hidden md:table-cell" },
    { header: "Date", accessor: "date", className: "hidden md:table-cell" },
    { header: "Status", accessor: "status" },
  ];

  const renderRow = (item: AttendanceList) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight transition-colors">
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.student.name}</h3>
          <span className="text-xs text-gray-500 md:hidden">{item.lesson.class.name}</span>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.lesson.class.name}</td>
      <td className="hidden md:table-cell">{item.lesson.subject.name}</td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-GB").format(item.date)}
      </td>
      <td>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          item.present ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {item.present ? "Present" : "Absent"}
        </span>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 shadow-sm">
      {/* TOP HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="hidden md:block text-xl font-bold text-gray-800">Attendance Log</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-lamaYellow hover:opacity-80 transition-opacity">
              <Image src="/filter.png" alt="Filter" width={16} height={16} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-lamaYellow hover:opacity-80 transition-opacity">
              <Image src="/sort.png" alt="Sort" width={16} height={16} />
            </button>
            {/* Action button for future "Mark Attendance" form */}
            <button className="bg-lamaPurple text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-90 transition-all">
              + Mark Today
            </button>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <Table columns={columns} renderRow={renderRow} data={data} />

      {/* FOOTER */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default AttendanceListPage;