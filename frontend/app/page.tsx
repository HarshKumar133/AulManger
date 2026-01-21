"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api";

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  async function loadTasks() {
    const res = await apiFetch("http://localhost:3000/tasks");

    if (!res.ok) {
      setLoggedIn(false);
      return;
    }

    const data = await res.json();
    setLoggedIn(true);
    setTasks(data);
  }

  async function addTask() {
    if (!title.trim()) return alert("Enter task");

    const res = await apiFetch("http://localhost:3000/tasks", {
      method: "POST",
      body: JSON.stringify({ title }),
    });

    if (!res.ok) return alert("Failed to add task");
    setTitle("");
    loadTasks();
  }

  async function deleteTask(id: number) {
    const res = await apiFetch(`http://localhost:3000/tasks/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) return alert("Delete failed");
    loadTasks();
  }

  async function logout() {
    await fetch("http://localhost:3000/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    alert("Logged out ✅");
    window.location.reload();
  }

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center items-start p-6">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-4">Task Manager ✅</h1>

        {!loggedIn ? (
          <div className="flex gap-4 mb-6">
            <Link className="text-blue-600 underline" href="/register">
              Register
            </Link>
            <Link className="text-blue-600 underline" href="/login">
              Login
            </Link>
          </div>
        ) : (
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded mb-6"
          >
            Logout
          </button>
        )}

        {loggedIn && (
          <>
            <div className="flex gap-2 mb-4">
              <input
                className="border px-3 py-2 rounded w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task..."
              />
              <button
                onClick={addTask}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Add
              </button>
            </div>

            <ul className="space-y-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between items-center border rounded px-3 py-2"
                >
                  <span>{t.title}</span>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="bg-gray-800 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
