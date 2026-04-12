import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import TableSearch from "@/components/TableSearch";
import Link from "next/link";

const MessagesPage = async () => {
  const { userId } = await auth();

  // Fetch unique conversations
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId! }, { receiverId: userId! }],
    },
    orderBy: { createdAt: "desc" },
    distinct: ['senderId', 'receiverId'], // Simplified logic to show unique chats
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Messages</h1>
        <TableSearch />
      </div>

      <div className="flex flex-col">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No messages yet.</div>
        ) : (
          messages.map((msg) => (
            <Link 
              href={`/list/messages/${msg.senderId === userId ? msg.receiverId : msg.senderId}`}
              key={msg.id}
              className="flex items-center gap-4 p-4 border-b hover:bg-slate-50 transition-colors"
            >
              <div className="w-12 h-12 bg-lamaPurple text-white rounded-full flex items-center justify-center font-bold">
                {msg.senderId.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">User {msg.senderId.substring(0, 5)}</span>
                  <span className="text-xs text-gray-400">
                    {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{msg.text}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default MessagesPage;