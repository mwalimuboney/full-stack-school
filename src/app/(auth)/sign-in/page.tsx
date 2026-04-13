"use client";

import { useSignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

// Separate component to use useSearchParams safely inside Suspense
const LoginForm = () => {
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { signIn, fetchStatus, errors } = useSignIn();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const loading = fetchStatus === "fetching";
  const router = useRouter();
  const searchParams = useSearchParams();

  // Where to go after login — respects ?redirect_url= set by middleware
  const redirectUrl = searchParams.get("redirect_url");

  const getRolePath = (role: string) => {
    const paths: Record<string, string> = {
      admin: "/admin",
      teacher: "/teacher",
      student: "/student",
      parent: "/parent",
    };
    return paths[role] ?? "/";
  };

  // Already logged in — send to dashboard immediately
  useEffect(() => {
    if (userLoaded && isSignedIn && user) {
      const role = user.publicMetadata?.role as string;
      router.replace(redirectUrl ?? getRolePath(role));
    }
  }, [userLoaded, isSignedIn, user, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || loading) return;

    setError("");
    setSuccess(false);

    const { error: signInError } = await signIn.password({
      identifier,
      password,
    });

    if (signInError) {
      setError(
        signInError.longMessage ??
        signInError.message ??
        "Invalid username or password"
      );
      return;
    }

    if (signIn.status === "needs_second_factor") {
      // MFA — redirect to MFA page if you have one
      router.push("/mfa");
      return;
    }

    if (signIn.status === "complete") {
      setSuccess(true);
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (!session) return;

          // Use redirect_url from middleware if present,
          // otherwise go to role dashboard
          const role = (session as any)?.publicUserData?.metadata?.role as string;
          const destination = redirectUrl ?? getRolePath(role);
          const url = decorateUrl(destination);

          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.replace(url);
          }
        },
      });
    }
  };

  // Show nothing while checking auth state — prevents flash of login form
  if (!userLoaded || (userLoaded && isSignedIn)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-lamaSkyLight gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500" />
        <p className="text-xs text-gray-400">Loading...</p>
      </div>
    );
  }

  const fieldError =
    errors?.fields?.identifier?.longMessage ??
    errors?.fields?.identifier?.message ??
    errors?.fields?.password?.longMessage ??
    errors?.fields?.password?.message;

  return (
    <div className="h-screen flex items-center justify-center bg-lamaSkyLight">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-12 rounded-md shadow-2xl flex flex-col gap-4 w-full max-w-[400px]"
      >
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={24} height={24} />
          S.A NDAKARU SENIOR HIGH SCHOOL
        </h1>
        <h2 className="text-gray-400">Sign in to your account</h2>

        {/* Error messages — show only one at a time */}
        {(error || fieldError) && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
            {error || fieldError}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded border border-green-200">
            Login successful! Redirecting...
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Username or Email</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError(""); // clear error on change
            }}
            required
            disabled={loading || success}
            autoComplete="username"
            className="p-3 rounded-md ring-1 ring-gray-300 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
            placeholder="Enter your username or email"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(""); // clear error on change
            }}
            required
            disabled={loading || success}
            autoComplete="current-password"
            className="p-3 rounded-md ring-1 ring-gray-300 outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading || success || !identifier.trim() || !password.trim()}
          className="bg-blue-500 text-white my-1 rounded-md text-sm p-3 hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex justify-center items-center font-medium"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in...
            </span>
          ) : success ? (
            "✓ Success!"
          ) : (
            "Sign In"
          )}
        </button>

        <div className="flex justify-end">
          <span
            onClick={() => router.push("/forgot-password")}
            className="text-xs text-purple-600 cursor-pointer hover:underline"
          >
            Forgot password?
          </span>
        </div>

        <div className="text-xs text-gray-500 text-center mt-2">
          Don&apos;t have an account?{" "}
          <span
            className="text-blue-500 cursor-pointer hover:underline"
            onClick={() => router.push("/sign-up")}
          >
            Sign Up
          </span>
        </div>
      </form>
    </div>
  );
};

// Wrap in Suspense because useSearchParams requires it in Next.js 15+
const LoginPage = () => (
  <Suspense
    fallback={
      <div className="h-screen flex items-center justify-center bg-lamaSkyLight">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500" />
      </div>
    }
  >
    <LoginForm />
  </Suspense>
);

export default LoginPage;