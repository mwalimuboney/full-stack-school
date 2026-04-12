import { z } from "zod";

// ─── SUBJECT ─────────────────────────────────────────────────────────────────

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  teachers: z.array(z.string()),
});

export type SubjectSchema = z.infer<typeof subjectSchema>;

// ─── CLASS ───────────────────────────────────────────────────────────────────

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Class name is required!" }), // ✅ was "Subject name"
  capacity: z.coerce.number().min(1, { message: "Capacity is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade is required!" }),
  supervisorId: z.coerce.string().optional(),
});

export type ClassSchema = z.infer<typeof classSchema>;

// ─── TEACHER ─────────────────────────────────────────────────────────────────

export const teacherSchema = z
  .object({
    id: z.string().optional(),
    username: z
      .string()
      .min(3, { message: "Username must be at least 3 characters long!" })
      .max(20, { message: "Username must be at most 20 characters long!" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long!" })
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    name: z.string().min(1, { message: "First name is required!" }),
    surname: z.string().min(1, { message: "Last name is required!" }),
    email: z
      .string()
      .email({ message: "Invalid email address!" })
      .or(z.literal("")),
    phone: z
      .string()
      .regex(/^\+?[\d\s\-()]{7,15}$/, { message: "Invalid phone number!" })
      .optional()
      .or(z.literal("")),
    address: z.string().min(1, { message: "Address is required!" }),
    img: z.string().optional(),
    bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], {
      message: "Valid blood type is required!",
    }),
    birthday: z.coerce.date({ message: "Birthday is required!" }),
    sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
    subjects: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      // Only validate match if password is being set
      if (data.password && data.confirmPassword) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    { message: "Passwords do not match!", path: ["confirmPassword"] }
  );

export type TeacherSchema = z.infer<typeof teacherSchema>;

// ─── STUDENT ─────────────────────────────────────────────────────────────────

export const studentSchema = z
  .object({
    id: z.string().optional(),
    username: z
      .string()
      .min(5, { message: "Username must be at least 5 characters long!" })
      .max(20, { message: "Username must be at most 20 characters long!" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long!" })
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    name: z.string().min(1, { message: "First name is required!" }),
    surname: z.string().min(1, { message: "Last name is required!" }),
    email: z
      .string()
      .email({ message: "Invalid email address!" })
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .regex(/^\+?[\d\s\-()]{7,15}$/, { message: "Invalid phone number!" })
      .optional()
      .or(z.literal("")),
    address: z.string().min(1, { message: "Address is required!" }),
    img: z.string().optional(),
    bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], {
      message: "Valid blood type is required!",
    }),
    birthday: z.coerce.date({ message: "Birthday is required!" }),
    sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
    gradeId: z.coerce.number().min(1, { message: "Grade is required!" }),
    classId: z.coerce.number().min(1, { message: "Class is required!" }),
    parentId: z.string().min(1, { message: "Parent is required!" }),
  })
  .refine(
    (data) => {
      if (data.password && data.confirmPassword) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    { message: "Passwords do not match!", path: ["confirmPassword"] }
  );

export type StudentSchema = z.infer<typeof studentSchema>;

// ─── EXAM ─────────────────────────────────────────────────────────────────────

export const examSchema = z
  .object({
    id: z.coerce.number().optional(),
    title: z.string().min(1, { message: "Title is required!" }),
    startTime: z.coerce.date({ message: "Start time is required!" }),
    endTime: z.coerce.date({ message: "End time is required!" }),
    lessonId: z.coerce.number({ message: "Lesson is required!" }),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time!",
    path: ["endTime"],
  });

export type ExamSchema = z.infer<typeof examSchema>;

// ─── ASSIGNMENT ───────────────────────────────────────────────────────────────

export const assignmentSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  startDate: z.coerce.date({ message: "Start date is required!" }),
  dueDate: z.coerce.date({ message: "Due date is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
}).refine((data) => data.dueDate > data.startDate, {
  message: "Due date must be after start date!",
  path: ["dueDate"],
});

export type AssignmentSchema = z.infer<typeof assignmentSchema>;

// ─── PARENT ───────────────────────────────────────────────────────────────────

export const parentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().min(1, { message: "Phone number is required!" }),
  address: z.string().min(1, { message: "Address is required!" }),
});

export type ParentSchema = z.infer<typeof parentSchema>;

// ─── LESSON ───────────────────────────────────────────────────────────────────

export const lessonSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Lesson name is required!" }),
  day: z.enum(
    ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    { message: "Day is required!" }
  ),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  subjectId: z.coerce.number({ message: "Subject is required!" }),
  classId: z.coerce.number({ message: "Class is required!" }),
  teacherId: z.string().min(1, { message: "Teacher is required!" }),
}).refine((data) => data.endTime > data.startTime, {
  message: "End time must be after start time!",
  path: ["endTime"],
});

export type LessonSchema = z.infer<typeof lessonSchema>;

// ─── ANNOUNCEMENT ─────────────────────────────────────────────────────────────

export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  classId: z.coerce.number().optional(),
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;

// ─── EVENT ────────────────────────────────────────────────────────────────────

export const eventSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  classId: z.coerce.number().optional(),
}).refine((data) => data.endTime > data.startTime, {
  message: "End time must be after start time!",
  path: ["endTime"],
});

export type EventSchema = z.infer<typeof eventSchema>;