"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiJson } from "../lib/api";
import { ArrowRight, LogIn } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function login() {
        setError("");
        setIsSubmitting(true);

        try {
            const { response, payload } = await apiJson<{ message?: string }>("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                setError(payload?.message || "Invalid credentials. Please try again.");
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
                    <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Welcome Back</p>
                    <h1 className="mt-4 text-4xl font-semibold leading-tight text-stone-800 md:text-5xl">
                        Build a calm flow and finish what matters.
                    </h1>
                    <p className="mt-4 max-w-lg text-stone-600">
                        Sign in to continue with your task workspace. Your session is managed using secure cookies.
                    </p>
                    <div className="mt-8 grid gap-3 text-sm text-stone-600">
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">Focused dashboard with context memory.</div>
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">Filter, prioritize, and resume exactly where you left off.</div>
                    </div>
                </section>

                <Card className="rounded-3xl border-stone-200/80 bg-white p-6 shadow-xl md:p-8">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white">
                            <LogIn className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold text-stone-800">Sign In</h2>
                            <p className="text-sm text-stone-500">Access your workspace</p>
                        </div>
                    </div>

                    <div className="space-y-4">
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
                                placeholder="Your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error ? (
                            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
                        ) : null}

                        <Button
                            onClick={login}
                            disabled={isSubmitting || !email || !password}
                            className="h-11 w-full bg-stone-900 text-white hover:bg-stone-800"
                        >
                            {isSubmitting ? "Signing in..." : "Sign In"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>

                    <p className="mt-6 text-sm text-stone-600">
                        New here?{" "}
                        <Link href="/register" className="font-medium text-stone-900 underline-offset-4 hover:underline">
                            Create an account
                        </Link>
                    </p>
                </Card>
            </div>
        </main>
    );
}
