"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#1C3B42" }}>
      <div className="w-full max-w-md rounded-xl p-8 shadow-2xl" style={{ backgroundColor: "#1C3B42", border: "1px solid rgba(192,222,199,0.2)" }}>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold" style={{ color: "#F7F3EC" }}>
            Element Event Solutions
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#C0DEC7" }}>
            Delivery Pricing Calculator
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-center text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium" style={{ color: "#C0DEC7" }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{
                backgroundColor: "#F7F3EC",
                borderColor: "#C0DEC7",
                color: "#1C3B42",
              }}
              placeholder="you@element.ca"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium" style={{ color: "#C0DEC7" }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{
                backgroundColor: "#F7F3EC",
                borderColor: "#C0DEC7",
                color: "#1C3B42",
              }}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#C0DEC7", color: "#1C3B42" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
