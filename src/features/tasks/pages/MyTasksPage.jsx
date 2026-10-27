import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  ListTodo,
  Plus,
  RefreshCw,
  Search,
  X,
  Trash2,
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "in-review", label: "In review" },
  { value: "completed", label: "Completed" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function getId(item) {
  return item?._id || item?.id || "";
}

function getArray(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function normalizeStatus(status) {
  return String(status || "todo")
    .toLowerCase()
    .replaceAll("_", "-");
}

function getStatusLabel(status) {
  const normalized = normalizeStatus(status);

  const labels = {
    todo: "To do",
    "in-progress": "In progress",
    "in-review": "In review",
    completed: "Completed",
  };

  return labels[normalized] || normalized;
}

const handleDeleteTask = async (event, task) => {
  event.stopPropagation();

  const taskId = task._id || task.id;

  if (!task._workspaceId || !task._projectId || !taskId) {
    window.alert("Missing workspace, project, or task ID.");
    return;
  }

  if (!window.confirm(`Delete "${task.title}" permanently?`)) {
    return;
  }

  console.log({
    taskId: task._id || task.id,
    workspaceId: task._workspaceId,
    projectId: task._projectId,
  });
  try {
    const response = await api.delete(
      `/projects/${task._workspaceId}/projects/${task._projectId}/tasks/${taskId}`,
    );

    setTasks((previousTasks) =>
      previousTasks.filter(
        (item) => String(item._id || item.id) !== String(taskId),
      ),
    );

    console.log("Task deleted:", response.data);
  } catch (error) {
    console.error("Delete task error:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      message: error.message,
    });

    window.alert(
      error.response?.data?.message ||
        `Delete failed (${error.response?.status || "network error"}). Check the browser console.`,
    );
  }
};

function getStatusClass(status) {
  const normalized = normalizeStatus(status);

  const classes = {
    todo: "bg-slate-100 text-slate-700",
    "in-progress": "bg-blue-100 text-blue-700",
    "in-review": "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
  };

  return classes[normalized] || "bg-muted text-muted-foreground";
}

function getPriorityClass(priority) {
  const normalized = String(priority || "medium").toLowerCase();

  const classes = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-slate-100 text-slate-600",
  };

  return classes[normalized] || "bg-muted text-muted-foreground";
}

function formatDate(date) {
  if (!date) return "No due date";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "No due date";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(task) {
  if (!task?.dueDate || normalizeStatus(task.status) === "completed") {
    return false;
  }

  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

export default function MyTasksPage() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [userRole, setUserRole] = useState("");

  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState("");

  const [assignedFilter, setAssignedFilter] = useState("mine");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const canAssignTasks = ["hr", "manager"].includes(userRole.toLowerCase());

  const loadTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [userResponse, workspaceResponse] = await Promise.all([
        api.get("/users/me"),
        api.get("/workspaces/my-workspaces"),
      ]);

      const userData = userResponse.data?.data?.user;
      const userId = getId(userData);

      setCurrentUserId(userId);
      setUserRole(String(userData?.role || "").toLowerCase());

      const workspaceData = workspaceResponse.data?.data;
      const workspaceList = getArray(workspaceData, "workspaces");

      setWorkspaces(workspaceList);

      const taskResults = await Promise.allSettled(
        workspaceList.map(async (workspace) => {
          const workspaceId = getId(workspace);

          const projectsResponse = await api.get(
            `/projects/${workspaceId}/projects`,
          );

          const projectData = projectsResponse.data?.data;
          const projectList = getArray(projectData, "projects");

          const projectResults = await Promise.allSettled(
            projectList.map(async (project) => {
              const projectId = getId(project);

              const taskResponse = await api.get(
                `/projects/${workspaceId}/projects/${projectId}/tasks`,
              );
              // toast.success("Task Assigned");

              // The tasks endpoint returns response.data.data as an array.
              const taskList = getArray(taskResponse.data?.data, "tasks");

              return taskList.map((task) => ({
                ...task,
                _workspaceId: workspaceId,
                _projectId: projectId,
                _workspaceName: workspace.name || "Workspace",
                _projectName: project.name || "Project",
              }));
            }),
          );

          return projectResults
            .filter((result) => result.status === "fulfilled")
            .flatMap((result) => result.value);
        }),
      );

      const allTasks = taskResults
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value);

      // Prevent duplicates if the same task appears more than once.
      const uniqueTasks = [
        ...new Map(
          allTasks.map((task, index) => [getId(task) || `task-${index}`, task]),
        ).values(),
      ];

      setTasks(uniqueTasks);
    } catch (err) {
      console.error("Failed to load tasks:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load tasks. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Load projects whenever a workspace is selected in the create-task panel.
  useEffect(() => {
    if (!selectedWorkspaceId) {
      setProjects([]);
      setSelectedProjectId("");
      return;
    }

    let cancelled = false;

    async function loadProjects() {
      setLoadingProjects(true);
      setProjects([]);
      setSelectedProjectId("");

      try {
        const response = await api.get(
          `/projects/${selectedWorkspaceId}/projects`,
        );

        if (cancelled) return;

        const projectData = response.data?.data;
        const projectList = getArray(projectData, "projects");

        setProjects(projectList);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load projects:", err);
          setProjects([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId]);

  const filteredTasks = tasks.filter((task) => {
    const assignedUserId =
      typeof task.assignedTo === "object"
        ? getId(task.assignedTo)
        : task.assignedTo || "";

    if (
      assignedFilter === "mine" &&
      String(assignedUserId) !== String(currentUserId)
    ) {
      return false;
    }

    if (assignedFilter === "unassigned" && assignedUserId) {
      return false;
    }

    if (
      statusFilter !== "all" &&
      normalizeStatus(task.status) !== statusFilter
    ) {
      return false;
    }

    if (
      priorityFilter !== "all" &&
      String(task.priority || "medium").toLowerCase() !== priorityFilter
    ) {
      return false;
    }

    const query = search.trim().toLowerCase();

    if (query) {
      const searchableText = [
        task.title,
        task.description,
        task._projectName,
        task._workspaceName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  });

  const myTasks = tasks.filter((task) => {
    const assignedUserId =
      typeof task.assignedTo === "object"
        ? getId(task.assignedTo)
        : task.assignedTo || "";

    return String(assignedUserId) === String(currentUserId);
  });

  const completedTasks = myTasks.filter(
    (task) => normalizeStatus(task.status) === "completed",
  ).length;

  const remainingTasks = myTasks.filter(
    (task) => normalizeStatus(task.status) !== "completed",
  ).length;

  const handleCreateTask = () => {
    if (!selectedWorkspaceId || !selectedProjectId) return;

    navigate(
      `/workspaces/${selectedWorkspaceId}/projects/${selectedProjectId}/tasks/new`,
    );
  };

  const handleWorkspaceChange = (event) => {
    setSelectedWorkspaceId(event.target.value);
    setSelectedProjectId("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading tasks...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            View and manage tasks across your workspaces and projects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAssignTasks && (
            <Button
              onClick={() => setShowCreateTask((previous) => !previous)}
              className="gap-2"
            >
              {showCreateTask ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              {showCreateTask ? "Close" : "Create task"}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => loadTasks(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Create-task panel: HR and managers only */}
      {canAssignTasks && showCreateTask && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Create a task</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a workspace and project to continue.
            </p>
          </div>

          {workspaces.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              You don't have access to any workspaces yet. Create or join a
              workspace before creating a task.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="taskWorkspace" className="text-sm font-medium">
                  Workspace
                </label>

                <select
                  id="taskWorkspace"
                  value={selectedWorkspaceId}
                  onChange={handleWorkspaceChange}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select a workspace</option>

                  {workspaces.map((workspace) => (
                    <option key={getId(workspace)} value={getId(workspace)}>
                      {workspace.name || "Unnamed workspace"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="taskProject" className="text-sm font-medium">
                  Project
                </label>

                <select
                  id="taskProject"
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  disabled={!selectedWorkspaceId || loadingProjects}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {loadingProjects
                      ? "Loading projects..."
                      : !selectedWorkspaceId
                        ? "Select a workspace first"
                        : projects.length === 0
                          ? "No projects available"
                          : "Select a project"}
                  </option>

                  {projects.map((project) => (
                    <option key={getId(project)} value={getId(project)}>
                      {project.name || "Unnamed project"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateTask(false)}>
              Cancel
            </Button>

            <Button
              onClick={handleCreateTask}
              disabled={
                !selectedWorkspaceId || !selectedProjectId || loadingProjects
              }
              className="gap-2"
            >
              Continue
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Something went wrong</p>
            <p className="mt-1">{error}</p>

            <button
              type="button"
              onClick={() => loadTasks()}
              className="mt-2 font-semibold underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Assigned to me
            </p>
            <Circle className="h-5 w-5 text-blue-500" />
          </div>

          <p className="mt-3 text-3xl font-bold">{myTasks.length}</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Remaining
            </p>
            <Clock3 className="h-5 w-5 text-amber-500" />
          </div>

          <p className="mt-3 text-3xl font-bold">{remainingTasks}</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Completed
            </p>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>

          <p className="mt-3 text-3xl font-bold">{completedTasks}</p>
        </div>
      </div>

      {/* Search and filters */}
      <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks, projects, or workspaces..."
            className="h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label
              htmlFor="assignedFilter"
              className="text-xs font-medium text-muted-foreground"
            >
              Assigned to
            </label>

            <select
              id="assignedFilter"
              value={assignedFilter}
              onChange={(event) => setAssignedFilter(event.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="mine">My tasks</option>
              <option value="all">All accessible tasks</option>
              <option value="unassigned">Unassigned tasks</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="statusFilter"
              className="text-xs font-medium text-muted-foreground"
            >
              Status
            </label>

            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="priorityFilter"
              className="text-xs font-medium text-muted-foreground"
            >
              Priority
            </label>

            <select
              id="priorityFilter"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSearch("");
                setAssignedFilter("mine");
                setStatusFilter("all");
                setPriorityFilter("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      </section>

      {/* Task list heading */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {filteredTasks.length}{" "}
            {filteredTasks.length === 1 ? "task" : "tasks"} found
          </p>
        </div>
      </div>

      {/* Task cards */}
      {!error && filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-5 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ListTodo className="h-7 w-7 text-muted-foreground" />
          </div>

          <h3 className="text-lg font-semibold">No tasks found</h3>

          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {tasks.length === 0
              ? "There are no tasks in your accessible projects yet."
              : "Try changing your search or filters to find tasks."}
          </p>

          {canAssignTasks && tasks.length === 0 && (
            <Button
              className="mt-5 gap-2"
              onClick={() => setShowCreateTask(true)}
            >
              <Plus className="h-4 w-4" />
              Create task
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTasks.map((task, index) => {
            const taskId = getId(task);
            const overdue = isOverdue(task);

            return (
              <button
                type="button"
                key={taskId || index}
                onClick={() =>
                  navigate(
                    `/workspaces/${task._workspaceId}/projects/${task._projectId}/tasks/${taskId}`,
                  )
                }
                className="group flex w-full flex-col rounded-xl border bg-card p-5 text-left transition hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 font-semibold transition group-hover:text-primary">
                    {task.title || "Untitled task"}
                  </h3>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityClass(task.priority)}`}
                  >
                    {String(task.priority || "medium").toUpperCase()}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {task.description || "No description provided."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(task.status)}`}
                  >
                    {getStatusLabel(task.status)}
                  </span>

                  {overdue && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                      Overdue
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 border-t pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 shrink-0" />
                    <span className="truncate">{task._projectName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>Due {formatDate(task.dueDate)}</span>
                  </div>

                  <p className="truncate">Workspace: {task._workspaceName}</p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    View task details
                  </span>

                  <div className="flex items-center gap-2">
                    {canAssignTasks && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={(event) => handleDeleteTask(event, task)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    )}

                    <span className="text-sm font-medium text-primary">
                      Open →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
