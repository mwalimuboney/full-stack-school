import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-lamaSkyLight gap-6">
      <Image src="/logo.png" alt="Logo" width={48} height={48} />
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <h2 className="text-xl font-semibold text-gray-600 mt-2">
          Page Not Found
        </h2>
        <p className="text-gray-400 text-sm mt-2 max-w-sm">
          The page you are looking for doesn&apos;t exist or you don&apos;t
          have permission to access it.
        </p>
      </div>
      <Link
        href="/"
        className="bg-purple-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition"
      >
        Go Home
      </Link>
    </div>
  );
}