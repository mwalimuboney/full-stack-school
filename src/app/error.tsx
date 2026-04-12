"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-lamaSkyLight gap-6">
      <Image src="/logo.png" alt="Logo" width={48} height={48} />
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800">500</h1>
        <h2 className="text-xl font-semibold text-gray-600 mt-2">
          Something Went Wrong
        </h2>
        <p className="text-gray-400 text-sm mt-2 max-w-sm">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-purple-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="bg-white text-purple-600 border border-purple-600 px-6 py-2 rounded-md text-sm font-medium hover:bg-purple-50 transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}