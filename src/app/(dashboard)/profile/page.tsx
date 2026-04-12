import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { notFound } from "next/navigation";

const ProfilePage = async () => {
  const user = await currentUser();

  if (!user) return notFound();

  // Fetch extra details from your DB based on Clerk ID
  // This works for admins, teachers, or students
  const role = user.publicMetadata.role as string;
  
  // Dynamic query based on role
  const dbUser = await (prisma as any)[role].findUnique({
    where: { id: user.id },
    ...(role === "student" && { include: { class: true } }),
    ...(role === "teacher" && { include: { subjects: true } }),
  });

  return (
    <div className="p-4 flex flex-col gap-6 xl:flex-row">
      {/* LEFT: USER INFO CARD */}
      <div className="w-full xl:w-2/3">
        <div className="bg-lamaSky py-6 px-4 rounded-2xl flex gap-4 shadow-sm">
          <div className="w-1/3">
            <Image
              src={user.imageUrl || "/noAvatar.png"}
              alt=""
              width={144}
              height={144}
              className="w-36 h-36 rounded-full object-cover border-4 border-white"
            />
          </div>
          <div className="w-2/3 flex flex-col justify-between gap-4">
            <h1 className="text-2xl font-semibold">{dbUser?.name || user.firstName}</h1>
            <p className="text-sm text-gray-500">
              User profile and account settings for the school management system.
            </p>
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
              <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                <Image src="/blood.png" alt="" width={14} height={14} />
                <span>{dbUser?.bloodType || "A+"}</span>
              </div>
              <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                <Image src="/date.png" alt="" width={14} height={14} />
                <span>January 2026</span>
              </div>
              <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                <Image src="/mail.png" alt="" width={14} height={14} />
                <span>{user.emailAddresses[0].emailAddress}</span>
              </div>
              <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                <Image src="/phone.png" alt="" width={14} height={14} />
                <span>{dbUser?.phone || "+1 234 567"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: SHORTCUTS/STATS */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md shadow-sm">
          <h1 className="text-xl font-semibold">Shortcuts</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <button className="p-3 rounded-md bg-lamaSkyLight hover:bg-lamaSky transition-colors">User's Lessons</button>
            <button className="p-3 rounded-md bg-lamaPurpleLight hover:bg-lamaPurple transition-colors">User's Teachers</button>
            <button className="p-3 rounded-md bg-pink-50 hover:bg-pink-100 transition-colors">User's Exams</button>
            <button className="p-3 rounded-md bg-lamaYellowLight hover:bg-lamaYellow transition-colors">User's Assignments</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;