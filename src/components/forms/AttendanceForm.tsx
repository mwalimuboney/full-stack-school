"use client";

import { updateAttendance } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

const AttendanceForm = ({ 
  lessonId, 
  students 
}: { 
  lessonId: number, 
  students: { id: string, name: string }[] 
}) => {
  const [attendance, setAttendance] = useState(
    students.map(s => ({ studentId: s.id, present: true }))
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = (studentId: string) => {
    setAttendance(prev => 
      prev.map(item => 
        item.studentId === studentId ? { ...item, present: !item.present } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await updateAttendance(lessonId, new Date(), attendance);
    
    if (result.success) {
      router.refresh();
      // Close modal or show success message
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Mark Attendance</h1>
      <div className="max-h-[400px] overflow-y-auto">
        {students.map((student) => (
          <div key={student.id} className="flex items-center justify-between p-2 border-b">
            <span>{student.name}</span>
            <input 
              type="checkbox" 
              checked={attendance.find(a => a.studentId === student.id)?.present}
              onChange={() => handleToggle(student.id)}
              className="w-5 h-5 accent-lamaPurple"
            />
          </div>
        ))}
      </div>
      <button 
        disabled={loading}
        className="bg-lamaPurple text-white p-2 rounded-md disabled:bg-opacity-50"
      >
        {loading ? "Saving..." : "Save Attendance"}
      </button>
    </form>
  );
};