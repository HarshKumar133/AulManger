"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, apiJson } from "../lib/api";
import { ActivityLog, DashboardContext, Project, Task, TaskPriority } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Circle,
  Command,
  FolderKanban,
  History,
  ListFilter,
  Plus,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import WorkspaceAiPanel from "./WorkspaceAiPanel";

type SortBy = "createdAt" | "updatedAt" | "dueDate" | "priority" | "title";
type SortOrder = "asc" | "desc";
type DashboardView = "stream" | "compact";

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("none");
  const [newProjectName, setNewProjectName] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DashboardContext["status"]>("all");
  const [filterPriority, setFilterPriority] = useState<DashboardContext["priority"]>("all");
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [view, setView] = useState<DashboardView>("stream");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProjects = useCallback(async () => {
    const { response, payload } = await apiJson<Project[]>("/projects");
    if (!response.ok || !Array.isArray(payload)) return;
    setProjects(payload);
  }, []);

  const loadActivity = useCallback(async () => {
    const { response, payload } = await apiJson<ActivityLog[]>("/memory/activity?limit=10");
    if (!response.ok || !Array.isArray(payload)) return;
    setActivity(payload);
  }, []);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status !== "all") params.append("status", status);
    if (filterPriority !== "all") params.append("priority", filterPriority);
    if (selectedProjectId !== "all") params.append("projectId", selectedProjectId);
    if (includeArchived) params.append("includeArchived", "true");
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);
    params.append("limit", "150");

    try {
      const { response, payload } = await apiJson<Task[]>(`/tasks?${params.toString()}`);
      if (!response.ok) {
        setErrorMessage("Unable to load tasks right now.");
        setIsLoading(false);
        return;
      }
      setTasks(Array.isArray(payload) ? payload : []);
    } catch {
      setErrorMessage("Unable to reach server. Check backend/API URL.");
    } finally {
      setIsLoading(false);
    }
  }, [filterPriority, includeArchived, search, selectedProjectId, sortBy, sortOrder, status]);

  const loadSavedContext = useCallback(async () => {
    const { response, payload } = await apiJson<Array<{ scope: string; context: DashboardContext }>>("/memory/contexts");
    if (!response.ok || !Array.isArray(payload)) return;

    const dashboardContext = payload.find((item) => item.scope === "task-dashboard")?.context;
    if (!dashboardContext) return;

    setSearch(dashboardContext.search || "");
    setStatus(dashboardContext.status || "all");
    setFilterPriority(dashboardContext.priority || "all");
    setSelectedProjectId(dashboardContext.projectId || "all");
    setIncludeArchived(Boolean(dashboardContext.includeArchived));
    setSortBy(dashboardContext.sortBy || "updatedAt");
    setSortOrder(dashboardContext.sortOrder || "desc");
    setView(dashboardContext.view || "stream");
  }, []);

  const saveContext = useCallback(async () => {
    await apiFetch("/memory/contexts", {
      method: "POST",
      body: JSON.stringify({
        scope: "task-dashboard",
        context: {
          search,
          status,
          priority: filterPriority,
          projectId: selectedProjectId,
          includeArchived,
          sortBy,
          sortOrder,
          view,
        },
      }),
    });
  }, [filterPriority, includeArchived, search, selectedProjectId, sortBy, sortOrder, status, view]);

  async function createProject() {
    if (!newProjectName.trim()) return;

    const { response } = await apiJson<Project>("/projects", {
      method: "POST",
      body: JSON.stringify({ name: newProjectName.trim() }),
    });

    if (!response.ok) {
      setErrorMessage("Unable to create project.");
      return;
    }

    setNewProjectName("");
    await loadProjects();
    await loadActivity();
  }

  async function createTask() {
    if (!title.trim()) return;

    const { response } = await apiJson<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify({
        title,
        description: description || undefined,
        priority,
        dueDate: dueDate || undefined,
        projectId: taskProjectId === "none" ? undefined : Number(taskProjectId),
      }),
    });

    if (!response.ok) {
      setErrorMessage("Unable to create task.");
      return;
    }

    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setTaskProjectId("none");
    setIsDialogOpen(false);
    await loadTasks();
    await loadActivity();
  }

  async function toggleComplete(task: Task) {
    await apiFetch(`/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !task.completed }),
    });
    await loadTasks();
    await loadActivity();
  }

  async function deleteTask(id: number) {
    await apiFetch(`/tasks/${id}`, { method: "DELETE" });
    setSelectedTaskIds((prev) => prev.filter((taskId) => taskId !== id));
    await loadTasks();
    await loadActivity();
  }

  async function restoreTask(id: number) {
    await apiFetch(`/tasks/${id}/restore`, { method: "PATCH" });
    await loadTasks();
    await loadActivity();
  }

  async function bulkMarkDone() {
    if (selectedTaskIds.length === 0) return;

    await apiFetch("/tasks/bulk/update", {
      method: "PATCH",
      body: JSON.stringify({
        taskIds: selectedTaskIds,
        data: { completed: true },
      }),
    });

    setSelectedTaskIds([]);
    await loadTasks();
    await loadActivity();
  }

  async function bulkArchive() {
    if (selectedTaskIds.length === 0) return;

    await apiFetch("/tasks/bulk/delete", {
      method: "DELETE",
      body: JSON.stringify({ taskIds: selectedTaskIds }),
    });

    setSelectedTaskIds([]);
    await loadTasks();
    await loadActivity();
  }

  function toggleTaskSelection(taskId: number) {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  }

  function toggleSelectAllVisible() {
    const selectable = tasks.filter((task) => !task.deletedAt).map((task) => task.id);
    if (selectable.length === 0) return;

    const allSelected = selectable.every((id) => selectedTaskIds.includes(id));
    if (allSelected) {
      setSelectedTaskIds((prev) => prev.filter((id) => !selectable.includes(id)));
    } else {
      setSelectedTaskIds((prev) => Array.from(new Set([...prev, ...selectable])));
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSavedContext();
      void loadProjects();
      void loadActivity();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadSavedContext, loadProjects, loadActivity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTasks();
      void saveContext();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTasks, saveContext]);

  const getPriorityColor = (taskPriority: TaskPriority): string => {
    switch (taskPriority) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "low":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  const stats = useMemo(() => ({
    total: tasks.filter((t) => !t.deletedAt).length,
    completed: tasks.filter((t) => t.completed && !t.deletedAt).length,
    pending: tasks.filter((t) => !t.completed && !t.deletedAt).length,
    archived: tasks.filter((t) => t.deletedAt).length,
  }), [tasks]);

  const projectSummaries = useMemo(() => {
    return projects.map((project) => {
      const count = tasks.filter((task) => task.projectId === project.id && !task.deletedAt).length;
      return { ...project, count };
    });
  }, [projects, tasks]);

  return (
    <div className="dashboard-atmo min-h-screen">
      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5 md:py-6">
        <div className="grid gap-3 lg:grid-cols-[250px_minmax(0,1fr)_360px]">
          <aside className="soft-enter h-fit rounded-2xl border border-stone-200 bg-white/90 p-3 shadow-sm shadow-stone-300/20 lg:sticky lg:top-4">
            <div className="rounded-xl bg-stone-900 p-3 text-white">
              <p className="text-[11px] uppercase tracking-[0.16em] text-stone-300">Workspace</p>
              <p className="mt-1 text-lg font-semibold">Execution Hub</p>
            </div>

            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-stone-200 bg-white p-2">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">Quick Stats</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-stone-50 p-2"><span className="text-stone-500">Pending</span><p className="font-semibold text-stone-900">{stats.pending}</p></div>
                  <div className="rounded-md bg-stone-50 p-2"><span className="text-stone-500">Done</span><p className="font-semibold text-stone-900">{stats.completed}</p></div>
                </div>
              </div>

              <div className="rounded-lg border border-stone-200 bg-white p-2">
                <div className="mb-2 flex items-center gap-2">
                  <FolderKanban className="h-3.5 w-3.5 text-stone-500" />
                  <p className="text-xs font-medium text-stone-700">Projects</p>
                </div>
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId("all")}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs ${selectedProjectId === "all" ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"}`}
                  >
                    <span>All Projects</span>
                    <span>{stats.total}</span>
                  </button>
                  {projectSummaries.map((project) => (
                    <button
                      type="button"
                      key={project.id}
                      onClick={() => setSelectedProjectId(String(project.id))}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs ${selectedProjectId === String(project.id) ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"}`}
                    >
                      <span className="truncate">{project.name}</span>
                      <span>{project.count}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Input
                    placeholder="New project"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="h-8 border-stone-200 text-xs"
                  />
                  <Button onClick={createProject} size="sm" variant="outline" className="h-8 border-stone-300 px-2 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          <main className="space-y-3">
            <div className="soft-enter rounded-2xl border border-stone-200 bg-white/92 p-4 shadow-sm shadow-stone-300/20">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Channel</p>
                  <h1 className="mt-1 text-2xl font-semibold text-stone-900 md:text-3xl">Task Operations</h1>
                  <p className="mt-1 text-sm text-stone-600">Slack-inspired command layout with AI context and fast actions.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-stone-900 text-white hover:bg-stone-800">
                      <Plus className="mr-1.5 h-4 w-4" />
                      New Task
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="border-stone-200 sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold text-stone-900">Add Task</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-stone-700">Title</label>
                        <Input
                          placeholder="Task title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="border-stone-200"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-stone-700">Description</label>
                        <textarea
                          placeholder="Optional details"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="min-h-20 w-full rounded-lg border border-stone-200 p-2 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-stone-700">Priority</label>
                          <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                            <SelectTrigger className="border-stone-200 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-stone-700">Project</label>
                          <Select value={taskProjectId} onValueChange={setTaskProjectId}>
                            <SelectTrigger className="border-stone-200 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={String(project.id)}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-stone-700">Due Date</label>
                          <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="border-stone-200 text-sm"
                          />
                        </div>
                      </div>

                      <Button onClick={createTask} className="w-full bg-stone-900 text-white hover:bg-stone-800">
                        Create Task
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <div className="relative min-w-60 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    placeholder="Search tasks"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 border-stone-200 bg-white pl-10 text-sm"
                  />
                </div>

                <Select value={status} onValueChange={(value) => setStatus(value as DashboardContext["status"])}>
                  <SelectTrigger className="h-9 w-32 border-stone-200 bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Done</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value as DashboardContext["priority"])}>
                  <SelectTrigger className="h-9 w-32 border-stone-200 bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                  <SelectTrigger className="h-9 w-36 border-stone-200 bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updatedAt">Updated</SelectItem>
                    <SelectItem value="createdAt">Created</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                  size="sm"
                  variant="outline"
                  className="h-9 border-stone-300 text-stone-700"
                >
                  <ArrowUpDown className="mr-1 h-3.5 w-3.5" />
                  {sortOrder.toUpperCase()}
                </Button>

                <Button
                  onClick={() => setView((prev) => (prev === "stream" ? "compact" : "stream"))}
                  size="sm"
                  variant="outline"
                  className="h-9 border-stone-300 text-stone-700"
                >
                  <ListFilter className="mr-1 h-3.5 w-3.5" />
                  {view === "stream" ? "Compact" : "Stream"}
                </Button>

                <Button
                  onClick={() => setIncludeArchived((prev) => !prev)}
                  size="sm"
                  variant={includeArchived ? "default" : "outline"}
                  className={includeArchived ? "h-9 bg-stone-900 text-white hover:bg-stone-800" : "h-9 border-stone-300 bg-white text-stone-700"}
                >
                  {includeArchived ? "Archived" : "Active"}
                </Button>
              </div>
            </div>

            {selectedTaskIds.length > 0 ? (
              <div className="soft-enter rounded-xl border border-stone-200 bg-white/90 p-3 shadow-sm shadow-stone-300/20">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-stone-300 text-stone-700">{selectedTaskIds.length} selected</Badge>
                  <Button onClick={bulkMarkDone} size="sm" variant="outline" className="border-stone-300 text-stone-700">Mark Done</Button>
                  <Button onClick={bulkArchive} size="sm" variant="outline" className="border-stone-300 text-stone-700">Archive</Button>
                  <Button onClick={() => setSelectedTaskIds([])} size="sm" variant="ghost">Clear</Button>
                </div>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
            ) : null}

            <section className="space-y-2">
              {isLoading ? (
                <Card className="rounded-2xl border-stone-200 bg-white p-8 text-center text-stone-600">Loading tasks...</Card>
              ) : tasks.length === 0 ? (
                <Card className="rounded-2xl border-stone-200 bg-white p-12 text-center">
                  <Circle className="mx-auto mb-3 h-10 w-10 text-stone-300" />
                  <h3 className="font-medium text-stone-900">No tasks</h3>
                  <p className="mt-1 text-sm text-stone-600">Create one to get started</p>
                </Card>
              ) : (
                <>
                  <div className="mb-1 flex items-center justify-between px-1">
                    <Button onClick={toggleSelectAllVisible} size="sm" variant="ghost" className="h-8 text-xs text-stone-600">
                      <Command className="mr-1 h-3.5 w-3.5" />
                      Select All Visible
                    </Button>
                    <p className="text-xs text-stone-500">{tasks.length} tasks loaded</p>
                  </div>

                  {tasks.map((task, index) => {
                    const taskProject = projects.find((p) => p.id === task.projectId);
                    return (
                      <Card
                        key={task.id}
                        className={`lift-card soft-enter rounded-2xl border-stone-200 bg-white/95 p-4 shadow-sm shadow-stone-300/20 ${task.completed ? "opacity-60" : ""}`}
                        style={{ animationDelay: `${index * 28}ms` }}
                      >
                        <div className={`flex ${view === "compact" ? "items-center" : "items-start"} gap-3`}>
                          <div className="flex gap-2">
                            {!task.deletedAt ? (
                              <input
                                type="checkbox"
                                checked={selectedTaskIds.includes(task.id)}
                                onChange={() => toggleTaskSelection(task.id)}
                                className="mt-1 h-4 w-4 cursor-pointer"
                              />
                            ) : null}

                            <button
                              onClick={() => toggleComplete(task)}
                              disabled={Boolean(task.deletedAt)}
                              className="mt-0.5 transition-transform hover:scale-110 disabled:opacity-50"
                            >
                              {task.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-stone-300" />}
                            </button>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`font-medium ${task.completed ? "line-through text-stone-400" : "text-stone-900"}`}>{task.title}</p>
                            {view === "stream" && task.description ? <p className="mt-1 text-sm text-stone-600">{task.description}</p> : null}

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge className={`border text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${task.completed ? "border-emerald-200 text-emerald-700" : "border-blue-200 text-blue-700"}`}
                              >
                                {task.completed ? "Done" : "Pending"}
                              </Badge>

                              {taskProject ? (
                                <Badge variant="outline" className="border-stone-200 text-xs text-stone-600">
                                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: taskProject.color || "#1f2937" }} />
                                  {taskProject.name}
                                </Badge>
                              ) : null}

                              {task.dueDate ? (
                                <Badge variant="outline" className="border-stone-200 text-xs text-stone-600">
                                  <CalendarClock className="mr-1 h-3 w-3" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </Badge>
                              ) : null}

                              {task.deletedAt ? (
                                <Badge variant="outline" className="border-amber-200 text-xs text-amber-700">Archived</Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-shrink-0 gap-1.5">
                            {task.deletedAt ? (
                              <Button
                                onClick={() => restoreTask(task.id)}
                                size="sm"
                                variant="outline"
                                className="border-stone-200 text-xs text-stone-700"
                              >
                                <Undo2 className="h-3 w-3" />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  onClick={() => toggleComplete(task)}
                                  size="sm"
                                  variant="outline"
                                  className="border-stone-200 text-xs text-stone-700"
                                >
                                  {task.completed ? "✓" : "○"}
                                </Button>
                                <Button
                                  onClick={() => deleteTask(task.id)}
                                  size="sm"
                                  variant="destructive"
                                  className="bg-red-500 text-xs hover:bg-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </>
              )}
            </section>
          </main>

          <aside className="space-y-3 lg:sticky lg:top-4 lg:h-fit">
            <Card className="soft-enter rounded-2xl border-stone-200 bg-white/95 p-4 shadow-sm shadow-stone-300/20">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-stone-500" />
                <h3 className="text-sm font-semibold text-stone-900">Activity Feed</h3>
              </div>

              <div className="space-y-2">
                {activity.length === 0 ? (
                  <p className="text-xs text-stone-500">No activity yet</p>
                ) : (
                  activity.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="soft-enter rounded-md border border-stone-200 bg-stone-50 p-2.5"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <p className="text-xs font-medium text-stone-700">{entry.action.replaceAll(".", " ")}</p>
                      <p className="mt-0.5 text-xs text-stone-500">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <WorkspaceAiPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}
