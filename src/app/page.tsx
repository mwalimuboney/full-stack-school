import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  switch (role) {
    case "admin":
      redirect("/admin");
    case "teacher":
      redirect("/teacher");
    case "student":
      redirect("/student");
    case "parent":
      redirect("/parent");
    default:
      redirect("/sign-in");
  }
}