"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Plus, Search, Trash2, X } from "lucide-react";

export default function TaskDashboard() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState("medium");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [filterPriority, setFilterPriority] = useState("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    async function loadTasks() {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (status !== "all") params.append("status", status);
        if (filterPriority !== "all") params.append("priority", filterPriority);

        const res = await apiFetch(`/tasks?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setTasks(data);
    }

    async function createTask() {
        if (!title.trim()) return;
        const res = await apiFetch("/tasks", {
            method: "POST",
            body: JSON.stringify({ title, priority }),
        });
        if (!res.ok) return;
        setTitle("");
        setPriority("medium");
        setIsDialogOpen(false);
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
    }, [search, status, filterPriority]);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high": return "bg-red-100 text-red-700 border-red-200";
            case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "low": return "bg-green-100 text-green-700 border-green-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.completed).length,
        pending: tasks.filter(t => !t.completed).length,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="max-w-6xl mx-auto p-6 space-y-6">
                {/* Header with gradient */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10">
                        <h1 className="text-4xl font-bold mb-2">Task Manager</h1>
                        <p className="text-indigo-100">Organize your work, achieve your goals</p>
                    </div>

                    {/* Stats */}
                    <div className="relative z-10 mt-6 grid grid-cols-3 gap-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                            <p className="text-sm text-indigo-100">Total Tasks</p>
                            <p className="text-3xl font-bold">{stats.total}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                            <p className="text-sm text-indigo-100">Completed</p>
                            <p className="text-3xl font-bold">{stats.completed}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                            <p className="text-sm text-indigo-100">Pending</p>
                            <p className="text-3xl font-bold">{stats.pending}</p>
                        </div>
                    </div>
                </div>

                {/* Filters Card */}
                <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="relative flex-1 min-w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search tasks..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>

                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-[160px] border-gray-200">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                            <SelectTrigger className="w-[160px] border-gray-200">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="ml-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Task
                                </Button>
                            </DialogTrigger>

                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold">Create New Task</DialogTitle>
                                </DialogHeader>

                                <div className="space-y-4 mt-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-2 block">Task Title</label>
                                        <Input
                                            placeholder="Enter task title..."
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="border-gray-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-2 block">Priority</label>
                                        <Select value={priority} onValueChange={setPriority}>
                                            <SelectTrigger className="border-gray-200">
                                                <SelectValue placeholder="Select priority" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">🟢 Low</SelectItem>
                                                <SelectItem value="medium">🟡 Medium</SelectItem>
                                                <SelectItem value="high">🔴 High</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button
                                        onClick={createTask}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-11"
                                    >
                                        Create Task
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </Card>

                {/* Tasks List */}
                <div className="space-y-3">
                    {tasks.length === 0 ? (
                        <Card className="p-12 text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <div className="text-gray-400 mb-2">
                                <Circle className="h-16 w-16 mx-auto mb-4" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">No tasks yet</h3>
                            <p className="text-gray-500">Create your first task to get started!</p>
                        </Card>
                    ) : (
                        tasks.map((t) => (
                            <Card
                                key={t.id}
                                className={`p-5 border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm ${t.completed ? 'opacity-75' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <button
                                            onClick={() => toggleComplete(t)}
                                            className="mt-1 transition-transform hover:scale-110"
                                        >
                                            {t.completed ? (
                                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                            ) : (
                                                <Circle className="h-6 w-6 text-gray-300 hover:text-indigo-500" />
                                            )}
                                        </button>

                                        <div className="flex-1">
                                            <p className={`text-lg font-medium mb-2 ${t.completed ? "line-through text-gray-400" : "text-gray-800"
                                                }`}>
                                                {t.title}
                                            </p>
                                            <div className="flex gap-2 flex-wrap">
                                                <Badge className={`${getPriorityColor(t.priority)} border font-medium`}>
                                                    {t.priority.toUpperCase()}
                                                </Badge>
                                                <Badge
                                                    variant={t.completed ? "secondary" : "default"}
                                                    className={t.completed ? "bg-green-100 text-green-700 border-green-200" : "bg-blue-100 text-blue-700 border-blue-200"}
                                                >
                                                    {t.completed ? "✓ Completed" : "○ Pending"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleComplete(t)}
                                            className="border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
                                        >
                                            {t.completed ? "Undo" : "Done"}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => deleteTask(t.id)}
                                            className="bg-red-500 hover:bg-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}