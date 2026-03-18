"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./lib/api";
import TaskDashboard from "./components/TaskDashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, LogIn, LogOut, Sparkles, UserPlus } from "lucide-react";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await apiFetch("/tasks");
      setLoggedIn(res.ok);
    } catch {
      setLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, []);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" });
    setLoggedIn(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkAuth();
    }, 0);

    return () => clearTimeout(timer);
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="app-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-stone-900" />
          <p className="font-medium text-stone-700">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="app-bg min-h-screen px-4 py-10 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1.15fr_1fr]">
          <section className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl backdrop-blur md:p-10">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-stone-500">
              <Sparkles className="h-3.5 w-3.5" />
              Calm Productivity
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-stone-800 md:text-6xl">
              A cleaner task workspace with built-in context memory.
            </h1>
            <p className="mt-5 max-w-2xl text-stone-600 md:text-lg">
              Organize your day with focus-first visuals, meaningful filters, and a workflow that remembers your context.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="block">
                <Button className="h-11 bg-stone-900 px-6 text-white hover:bg-stone-800">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </Button>
              </Link>
              <Link href="/login" className="block">
                <Button variant="outline" className="h-11 border-stone-300 px-6 text-stone-800 hover:bg-stone-100">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Card className="rounded-2xl border-stone-200 bg-stone-50 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.12em] text-stone-500">Clarity</p>
                <p className="mt-2 text-sm font-medium text-stone-700">Designed for fast scanning and decision making.</p>
              </Card>
              <Card className="rounded-2xl border-stone-200 bg-stone-50 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.12em] text-stone-500">Memory</p>
                <p className="mt-2 text-sm font-medium text-stone-700">Your dashboard remembers filters and preferences.</p>
              </Card>
              <Card className="rounded-2xl border-stone-200 bg-stone-50 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.12em] text-stone-500">Momentum</p>
                <p className="mt-2 text-sm font-medium text-stone-700">Stay in flow with low-friction task operations.</p>
              </Card>
            </div>
          </section>

          <Card className="rounded-3xl border-stone-200/80 bg-white p-6 shadow-xl md:p-8">
            <h2 className="text-2xl font-semibold text-stone-800">Today at a glance</h2>
            <p className="mt-2 text-sm text-stone-600">Set priorities, finish deep work, and keep context in one place.</p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-stone-500">Morning Focus</p>
                <p className="mt-2 text-sm text-stone-700">Review pending tasks and plan your top three outcomes.</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-stone-500">Execution</p>
                <p className="mt-2 text-sm text-stone-700">Use filters and priorities to move quickly through your list.</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-stone-500">Reflection</p>
                <p className="mt-2 text-sm text-stone-700">Your timeline tracks progress so you can review momentum.</p>
              </div>
            </div>

            <p className="mt-6 text-sm text-stone-500">No clutter. No guesswork. Just clear progress.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen">
      <nav className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-stone-800">
              Task Manager
            </span>
          </div>

          <Button
            onClick={logout}
            variant="outline"
            className="border-stone-300 text-stone-700 hover:bg-stone-100"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <TaskDashboard />
    </div>
  );
}
