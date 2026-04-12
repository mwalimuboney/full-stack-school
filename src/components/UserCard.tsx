import prisma from "@/lib/prisma";
import Image from "next/image";

interface UserCardProps {
  type: "admin" | "teacher" | "student" | "parent";
}

const UserCard = async ({ type }: UserCardProps) => {
  // Directly mapping the model to avoid 'any'
  // Prisma types ensure .count() is available on all these models
  const data = await (prisma[type] as any).count();

  return (
    <div className="rounded-2xl odd:bg-lamaPurple even:bg-lamaYellow p-4 flex-1 min-w-[130px] shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600 font-medium">
          2024/25
        </span>
        <button className="hover:bg-black/5 rounded-full p-1 transition-colors">
          <Image src="/more.png" alt="View more" width={20} height={20} />
        </button>
      </div>
      {/* toLocaleString() adds commas for thousands */}
      <h1 className="text-2xl font-semibold my-4">{data.toLocaleString()}</h1>
      <h2 className="capitalize text-sm font-medium text-gray-500">{type}s</h2>
    </div>
  );
};

export default UserCard;