"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiJson } from "../lib/api";
import { ArrowRight, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function register() {
    setError("");
    setIsSubmitting(true);

    try {
      const registerRes = await apiJson<{ message?: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      if (!registerRes.response.ok) {
        setError(registerRes.payload?.message || "Unable to register with these details.");
        setIsSubmitting(false);
        return;
      }

      const loginRes = await apiJson<{ message?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.response.ok) {
        router.push("/login");
        setIsSubmitting(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to reach server. Please check backend/API URL and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-bg min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Get Started</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-stone-800 md:text-5xl">
            Create your personal command center for focused work.
          </h1>
          <p className="mt-4 max-w-lg text-stone-600">
            Track tasks, preserve context, and stay consistent day after day with a cleaner productivity flow.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-stone-600">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">Contextual memory keeps your preferred filters ready.</div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">Project and priority structure scales as your workload grows.</div>
          </div>
        </section>

        <Card className="rounded-3xl border-stone-200/80 bg-white p-6 shadow-xl md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-stone-800">Create Account</h2>
              <p className="text-sm text-stone-500">Start organizing your work</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Name</label>
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Password</label>
              <Input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
            ) : null}

            <Button
              onClick={register}
              disabled={isSubmitting || !name || !email || !password}
              className="h-11 w-full bg-stone-900 text-white hover:bg-stone-800"
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <p className="mt-6 text-sm text-stone-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-stone-900 underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
