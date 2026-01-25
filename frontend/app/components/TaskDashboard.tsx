"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  async function loadTasks() {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status !== "all") params.append("status", status);
    if (priority !== "all") params.append("priority", priority);

    const res = await apiFetch(`/tasks?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setTasks(data);
  }

  async function createTask() {
    const res = await apiFetch("/tasks", {
      method: "POST",
      body: JSON.stringify({ title, priority }),
    });
    if (!res.ok) return;
    setTitle("");
    loadTasks();
  }

  async function toggleComplete(task: any) {
    await apiFetch(`/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !task.completed }),
    });
    loadTasks();
  }

  async function deleteTask(id: number) {
    await apiFetch(`/tasks/${id}`, { method: "DELETE" });
    loadTasks();
  }

  useEffect(() => {
    loadTasks();
  }, [search, status, priority]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Task Manager</h1>
      </div>

      <Card className="p-4 mb-6 flex gap-3 flex-wrap">
        <Input
          placeholder="Search task..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[250px]"
        />

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="ml-auto">+ Add Task</Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={createTask} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>

      <div className="space-y-3">
        {tasks.map((t) => (
          <Card key={t.id} className="p-4 flex items-center justify-between">
            <div>
              <p className={`font-medium ${t.completed ? "line-through text-gray-400" : ""}`}>
                {t.title}
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{t.priority}</Badge>
                <Badge variant={t.completed ? "secondary" : "default"}>
                  {t.completed ? "Completed" : "Pending"}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => toggleComplete(t)}>
                {t.completed ? "Undo" : "Done"}
              </Button>
              <Button variant="destructive" onClick={() => deleteTask(t.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}