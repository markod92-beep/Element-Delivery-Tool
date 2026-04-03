"use client";

import { useSession, signOut } from "next-auth/react";

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#1C3B42" }}>
        <p style={{ color: "#F7F3EC" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#1C3B42" }}>
      <header className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "rgba(192,222,199,0.2)" }}>
        <h1 className="text-xl font-bold" style={{ color: "#F7F3EC" }}>
          Element Delivery Tool
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "#C0DEC7" }}>
            Welcome, {session?.user?.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "rgba(192,222,199,0.15)", color: "#C0DEC7" }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="mb-8 text-2xl font-bold" style={{ color: "#F7F3EC" }}>
          Calculators
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <a
            href="/quote/delivery"
            className="group rounded-xl border p-6 transition-colors hover:border-opacity-60"
            style={{ borderColor: "rgba(192,222,199,0.3)", backgroundColor: "rgba(192,222,199,0.05)" }}
          >
            <h3 className="mb-2 text-lg font-semibold" style={{ color: "#C0DEC7" }}>
              Delivery Calculator
            </h3>
            <p className="text-sm" style={{ color: "#F7F3EC", opacity: 0.7 }}>
              Calculate delivery pricing based on FSA zone, distance, venue, and complexity factors.
            </p>
          </a>

          <a
            href="/quote/installation"
            className="group rounded-xl border p-6 transition-colors hover:border-opacity-60"
            style={{ borderColor: "rgba(192,222,199,0.3)", backgroundColor: "rgba(192,222,199,0.05)" }}
          >
            <h3 className="mb-2 text-lg font-semibold" style={{ color: "#C0DEC7" }}>
              Installation Calculator
            </h3>
            <p className="text-sm" style={{ color: "#F7F3EC", opacity: 0.7 }}>
              Calculate installation labour costs based on furniture items, truck capacity, and setup time.
            </p>
          </a>
        </div>
      </main>
    </div>
  );
}
