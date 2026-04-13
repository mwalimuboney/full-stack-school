import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Download, PlayCircle, ArrowLeft } from "lucide-react";

export default async function SingleNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await prisma.note.findUnique({
    where: { id: parseInt(id) },
    include: { class: true, teacher: true }
  });

  if (!note) notFound();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link href="/list/notes" className="flex items-center gap-2 text-gray-500 mb-6 hover:text-black">
        <ArrowLeft size={16} /> Back to Library
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-black text-gray-900">{note.title}</h1>
            <div className="flex gap-2 my-4">
               <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                 Type: {note.fileType.toUpperCase()}
               </span>
            </div>
            <p className="text-gray-600 leading-relaxed mb-8">{note.description}</p>
            
            <div className="grid grid-cols-2 gap-4 border-t pt-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Author</p>
                <p className="text-sm font-medium">{note.teacher?.name} {note.teacher?.surname}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Target Class</p>
                <p className="text-sm font-medium">{note.class?.name || "General Access"}</p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-3">
            {/* Kitufe cha kuanza kusoma - kinafungua Learning Page tuliyotengeneza awali */}
            <Link 
              href={`/learning/${note.id}`}
              className="w-full bg-blue-600 text-white flex items-center justify-center gap-2 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all"
            >
              <PlayCircle size={20} /> Open Material
            </Link>
            
            <a 
              href={note.fileUrl} 
              download 
              className="w-full bg-gray-50 text-gray-700 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-100"
            >
              <Download size={18} /> Download File
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
