import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { sendMessage } from "@/lib/actions"; // We will create this

const ChatRoom = async ({ params }: { params: { id: string } }) => {
  const { userId } = await auth();
  const receiverId = params.id;

  const chatHistory = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId!, receiverId: receiverId },
        { senderId: receiverId, receiverId: userId! },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] bg-white m-4 rounded-md shadow-sm">
      <div className="p-4 border-b font-bold">Chat with {receiverId.substring(0, 8)}</div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {chatHistory.map((msg) => (
          <div 
            key={msg.id} 
            className={`max-w-[70%] p-3 rounded-lg ${
              msg.senderId === userId 
                ? "bg-lamaPurple text-white self-end" 
                : "bg-slate-100 text-gray-800 self-start"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <form action={sendMessage} className="p-4 border-t flex gap-2">
        <input type="hidden" name="receiverId" value={receiverId} />
        <input 
          name="text"
          placeholder="Type a message..." 
          className="flex-1 border rounded-full px-4 py-2 outline-none focus:border-lamaPurple"
        />
        <button className="bg-lamaPurple text-white px-6 py-2 rounded-full font-medium">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatRoom;