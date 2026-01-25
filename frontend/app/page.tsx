"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api";
import TaskDashboard from "./components/TaskDashboard";
import { Button } from "@/components/ui/button";
import { LogOut, UserPlus, LogIn } from "lucide-react";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  async function checkAuth() {
    const res = await apiFetch("/tasks");
    setLoggedIn(res.ok);
    setLoading(false);
  }

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" });
    setLoggedIn(false);
  }

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Hero Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 border-0">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Task Manager
              </h1>
              <p className="text-gray-600">
                Organize your tasks, boost your productivity
              </p>
            </div>

            <div className="space-y-3">
              <Link href="/register" className="block">
                <Button className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Create Account
                </Button>
              </Link>

              <Link href="/login" className="block">
                <Button variant="outline" className="w-full h-12 border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300">
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md">
              <div className="text-2xl mb-1">✓</div>
              <p className="text-xs text-gray-600 font-medium">Easy to Use</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md">
              <div className="text-2xl mb-1">🚀</div>
              <p className="text-xs text-gray-600 font-medium">Fast & Secure</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md">
              <div className="text-2xl mb-1">📱</div>
              <p className="text-xs text-gray-600 font-medium">Responsive</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Task Manager
            </span>
          </div>

          <Button
            onClick={logout}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
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
