"use client";

import { useSignUp, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SignUpPage = () => {
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { signUp, fetchStatus, errors: signUpErrors } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ username: "", email: "" });

  const router = useRouter();
  const loading = fetchStatus === "fetching";

  const formatKenyanNumber = (num: string) => {
    let clean = num.replace(/\D/g, "");
    if (clean.startsWith("0")) clean = clean.substring(1);
    return `+254${clean}`;
  };

  const passwordsMatch = password && confirmPassword ? password === confirmPassword : null;

  // Redirect if already signed in
  useEffect(() => {
    if (userLoaded && isSignedIn && user) {
      const role = user.publicMetadata?.role as string;
      const paths: Record<string, string> = {
        admin: "/admin",
        teacher: "/teacher",
        student: "/student",
        parent: "/parent",
      };
      router.push(paths[role] ?? "/");
    }
  }, [userLoaded, isSignedIn, user, router]);

  // Field validation
  useEffect(() => {
    if (username.length > 0 && username.length < 5) {
      setFieldErrors((p) => ({ ...p, username: "Username must be at least 5 characters" }));
    } else {
      setFieldErrors((p) => ({ ...p, username: "" }));
    }
  }, [username]);

  useEffect(() => {
    if (emailAddress.length > 0 && !emailAddress.toLowerCase().endsWith("@gmail.com")) {
      setFieldErrors((p) => ({ ...p, email: "Only @gmail.com addresses are allowed" }));
    } else {
      setFieldErrors((p) => ({ ...p, email: "" }));
    }
  }, [emailAddress]);

  const isInvalid =
    !firstName.trim() ||
    !lastName.trim() ||
    username.length < 5 ||
    !emailAddress.toLowerCase().endsWith("@gmail.com") ||
    phoneNumber.replace(/\D/g, "").length < 9 ||
    !passwordsMatch ||
    loading;

  // Step 1: Create account
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp || !passwordsMatch) return;

    const formattedPhone = formatKenyanNumber(phoneNumber);
    if (formattedPhone.length !== 13) {
      return setError("Please enter a valid Kenyan phone number (e.g., 0712...)");
    }

    setError("");

    // Use the new password() method
    const { error: createError } = await signUp.password({
      firstName,
      lastName,
      emailAddress,
      username,
      password,
      unsafeMetadata: {
        role: "student",
        phone: formattedPhone,
      },
    });

    if (createError) {
      setError(createError.longMessage ?? createError.message ?? "Sign up failed");
      return;
    }

    // Send verification email using new verifications API
    const { error: verifyError } = await signUp.verifications.sendEmailCode();

    if (verifyError) {
      setError(verifyError.longMessage ?? verifyError.message ?? "Failed to send verification email");
      return;
    }

    setPendingVerification(true);
  };

  // Step 2: Verify OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;

    setError("");

    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });

    if (verifyError) {
      setError(verifyError.longMessage ?? verifyError.message ?? "Verification failed");
      return;
    }

    // Finalize session after successful verification
    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (!session) return;
        const url = decorateUrl("/");
        if (url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.push(url);
        }
      },
    });
  };

  if (!userLoaded) return null;

  return (
    <div className="h-screen flex items-center justify-center bg-lamaSkyLight p-4">
      <div className="bg-white p-10 rounded-md shadow-2xl flex flex-col gap-4 w-full max-w-[500px]">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={24} height={24} />
          S.A NDAKARU SENIOR HIGH SCHOOL
        </h1>

        {!pendingVerification ? (
          <>
            <h2 className="text-gray-400">Create your account</h2>
            {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{error}</p>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-row gap-4 w-full">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-gray-500">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="p-2 rounded-md ring-1 ring-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-gray-500">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="p-2 rounded-md ring-1 ring-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="p-2 rounded-md ring-1 ring-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
                {fieldErrors.username && (
                  <span className="text-[10px] text-red-500">{fieldErrors.username}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Email</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="p-2 rounded-md ring-1 ring-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
                {fieldErrors.email && (
                  <span className="text-[10px] text-red-500">{fieldErrors.email}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Phone Number (e.g. 0712345678)</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="p-2 rounded-md ring-1 ring-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="07..."
                  required
                />
              </div>

              <div className="flex flex-row gap-4 min-w-full">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="p-2 rounded-md ring-1 ring-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-gray-500">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="p-2 rounded-md ring-1 ring-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
              </div>

              {confirmPassword && (
                <p className={`text-[10px] font-bold ${passwordsMatch ? "text-green-500" : "text-red-500"}`}>
                  {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}

              <div id="clerk-captcha"></div>
              <button
                disabled={isInvalid}
                className={`text-white py-2 rounded-md font-medium transition mt-2 ${
                  isInvalid
                    ? "bg-purple-300 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 shadow-lg"
                }`}
              >
                {loading ? "Signing Up..." : "Sign Up"}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <h2 className="text-gray-600 font-semibold">Verify your Email</h2>
            <p className="text-xs text-gray-400">Enter the code sent to {emailAddress}</p>
            {error && <p className="text-xs text-red-500">{error}</p>}

            <input
              type="text"
              placeholder="Verification Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="p-2 rounded-md ring-1 ring-gray-300 text-center text-lg tracking-widest"
              required
            />

            <div id="clerk-captcha"></div>
            <button
              disabled={loading}
              className={`text-white py-2 rounded-md font-medium transition mt-2 ${
                loading
                  ? "bg-purple-300 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 shadow-lg"
              }`}
            >
              {loading ? "Verifying Account..." : "Verify Account"}
            </button>
          </form>
        )}

        <div className="text-xs text-gray-500 text-center mt-2">
          Already have an account?{" "}
          <span
            className="text-blue-500 cursor-pointer hover:underline"
            onClick={() => router.push("/sign-in")}
          >
            Sign In
          </span>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;