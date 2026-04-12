import 'dotenv/config';
import { Day, UserSex } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

async function main() {
  console.log("Checking database connection...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "FOUND" : "MISSING");

  try {
    const adminCount = await prisma.admin.count();
    if (adminCount > 0) {
      console.log("Database already seeded. Skipping...");
      return;
    }
  } catch (error) {
    console.error("Connection failed. Ensure DATABASE_URL is set correctly.");
    throw error;
  }

  const client = await clerkClient();

  // ─── ADMIN ───────────────────────────────────────────────────────────────

  await prisma.admin.createMany({
    data: [
      { id: "admin1", username: "admin1" },
      { id: "admin2", username: "admin2" },
    ],
  });

  // ─── GRADES ──────────────────────────────────────────────────────────────

  await prisma.grade.createMany({
    data: Array.from({ length: 6 }, (_, i) => ({ level: i + 1 })),
  });

  // ─── CLASSES ─────────────────────────────────────────────────────────────

  await prisma.class.createMany({
    data: Array.from({ length: 6 }, (_, i) => ({
      name: `${i + 1}A`,
      gradeId: i + 1,
      capacity: Math.floor(Math.random() * 6) + 15, // 15–20
    })),
  });

  // ─── SUBJECTS ────────────────────────────────────────────────────────────

  await prisma.subject.createMany({
    data: [
      { name: "Mathematics" },
      { name: "Science" },
      { name: "English" },
      { name: "History" },
      { name: "Geography" },
      { name: "Physics" },
      { name: "Chemistry" },
      { name: "Biology" },
      { name: "Computer Science" },
      { name: "Art" },
    ],
  });

  // ─── TEACHERS ────────────────────────────────────────────────────────────
  // Create Clerk users first, then DB records

  console.log("Creating teacher Clerk accounts...");
  for (let i = 1; i <= 15; i++) {
    const clerkUser = await client.users.createUser({
      username: `teacher${i}`,
      password: `Teacher${i}Pass!`,
      firstName: `TName${i}`,
      lastName: `TSurname${i}`,
      publicMetadata: { role: "teacher" },
    });

    await prisma.teacher.create({
      data: {
        id: clerkUser.id,           // ✅ Use Clerk ID, not hardcoded string
        username: `teacher${i}`,
        name: `TName${i}`,
        surname: `TSurname${i}`,
        email: `teacher${i}@example.com`,
        phone: `0712345${String(i).padStart(3, "0")}`,
        address: `Address${i}`,
        bloodType: "A+",
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
        subjects: { connect: [{ id: (i % 10) + 1 }] },
        classes: { connect: [{ id: (i % 6) + 1 }] },
        birthday: new Date(
          new Date().getFullYear() - 30,
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ),
      },
    });
  }

  // Store teacher Clerk IDs for lesson assignment
  const teachers = await prisma.teacher.findMany({
    select: { id: true },
    orderBy: { username: "asc" },
  });

  // ─── LESSONS ─────────────────────────────────────────────────────────────

  const days = Object.keys(Day) as (keyof typeof Day)[];

  await prisma.lesson.createMany({
    data: Array.from({ length: 30 }, (_, i) => {
      const startHour = 8 + (i % 8); // 08:00 to 15:00
      return {
        name: `Lesson${i + 1}`,
        day: Day[days[i % days.length]],
        startTime: new Date(2024, 0, 7 + (i % 5), startHour, 0, 0),   // ✅ fixed date
        endTime: new Date(2024, 0, 7 + (i % 5), startHour + 1, 0, 0), // ✅ fixed date
        subjectId: (i % 10) + 1,
        classId: (i % 6) + 1,
        teacherId: teachers[i % teachers.length].id, // ✅ real Clerk ID
      };
    }),
  });

  // ─── PARENTS ─────────────────────────────────────────────────────────────

  console.log("Creating parent Clerk accounts...");
  for (let i = 1; i <= 25; i++) {
    const clerkUser = await client.users.createUser({
      username: `parent${i}`,
      password: `Parent${i}Pass!`,
      firstName: `PName${i}`,
      lastName: `PSurname${i}`,
      publicMetadata: { role: "parent" },
    });

    await prisma.parent.create({
      data: {
        id: clerkUser.id,
        username: `parent${i}`,
        name: `PName${i}`,
        surname: `PSurname${i}`,
        email: `parent${i}@example.com`,
        phone: `0722345${String(i).padStart(3, "0")}`,
        address: `Address${i}`,
      },
    });
  }

  const parents = await prisma.parent.findMany({
    select: { id: true },
    orderBy: { username: "asc" },
  });

  // ─── STUDENTS ────────────────────────────────────────────────────────────

  console.log("Creating student Clerk accounts...");
  for (let i = 1; i <= 50; i++) {
    const clerkUser = await client.users.createUser({
      username: `student${i}`,
      password: `Student${i}Pass!`,
      firstName: `SName${i}`,
      lastName: `SSurname${i}`,
      publicMetadata: { role: "student" },
    });

    await prisma.student.create({
      data: {
        id: clerkUser.id,
        username: `student${i}`,
        name: `SName${i}`,
        surname: `SSurname${i}`,
        email: `student${i}@example.com`,
        phone: `0733345${String(i).padStart(3, "0")}`,
        address: `Address${i}`,
        bloodType: "O-",
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
        parentId: parents[i % parents.length].id, // ✅ real Clerk ID
        gradeId: (i % 6) + 1,
        classId: (i % 6) + 1,
        birthday: new Date(
          new Date().getFullYear() - 10,
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ),
      },
    });
  }

  const students = await prisma.student.findMany({
    select: { id: true },
    orderBy: { username: "asc" },
  });

  // ─── EXAMS ───────────────────────────────────────────────────────────────

  await prisma.exam.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      title: `Exam ${i + 1}`,
      startTime: new Date(2024, 5, 10 + i, 9, 0, 0),  // ✅ fixed dates
      endTime: new Date(2024, 5, 10 + i, 11, 0, 0),
      lessonId: (i % 30) + 1,
    })),
  });

  // ─── ASSIGNMENTS ─────────────────────────────────────────────────────────

  await prisma.assignment.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      title: `Assignment ${i + 1}`,
      startDate: new Date(2024, 5, 1 + i),             // ✅ fixed dates
      dueDate: new Date(2024, 5, 8 + i),
      lessonId: (i % 30) + 1,
    })),
  });

  // ─── RESULTS ─────────────────────────────────────────────────────────────

  await prisma.result.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      score: Math.floor(Math.random() * 41) + 60, // 60–100
      studentId: students[i % students.length].id,
      ...(i < 5 ? { examId: i + 1 } : { assignmentId: i - 4 }),
    })),
  });

  // ─── ATTENDANCE ──────────────────────────────────────────────────────────

  await prisma.attendance.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2024, 5, 3 + i),
      present: Math.random() > 0.2, // 80% attendance rate
      studentId: students[i % students.length].id,
      lessonId: (i % 30) + 1,
    })),
  });

  // ─── EVENTS ──────────────────────────────────────────────────────────────

  await prisma.event.createMany({
    data: Array.from({ length: 5 }, (_, i) => ({
      title: `Event ${i + 1}`,
      description: `Description for Event ${i + 1}`,
      startTime: new Date(2024, 6, 1 + i, 10, 0, 0),
      endTime: new Date(2024, 6, 1 + i, 12, 0, 0),
      classId: (i % 5) + 1,
    })),
  });

  // ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────

  await prisma.announcement.createMany({
    data: Array.from({ length: 5 }, (_, i) => ({
      title: `Announcement ${i + 1}`,
      description: `Description for Announcement ${i + 1}`,
      date: new Date(2024, 6, 1 + i),
      classId: (i % 5) + 1,
    })),
  });

  console.log("✅ Seeding completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });