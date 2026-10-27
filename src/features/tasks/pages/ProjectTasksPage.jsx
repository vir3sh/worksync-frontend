import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  ClipboardList,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const statusStyles = {
  todo: "bg-slate-100 text-slate-700",
  "in-progress": "bg-blue-100 text-blue-700",
  "in-review": "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
};

const priorityStyles = {
  low: "text-slate-500",
  medium: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-red-600",
};

const ASSIGNMENT_ROLES = ["hr", "manager"];

function formatDate(date) {
  if (!date) return "No due date";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid date";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProjectTasksPage() {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [checkingRole, setCheckingRole] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState("");

  const canAssignTasks = ASSIGNMENT_ROLES.includes(userRole.toLowerCase());

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/projects/${workspaceId}/projects/${projectId}/tasks`,
      );

      // The API returns the task array in response.data.data.
      const taskList = response.data.data;
      setTasks(Array.isArray(taskList) ? taskList : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load tasks. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await api.get("/users/me");
        const data = response.data.data;
        const user = data?.user || data;

        if (!cancelled) {
          setUserRole(
            typeof user?.role === "string" ? user.role.toLowerCase() : "",
          );
        }
      } catch (err) {
        if (!cancelled) {
          setUserRole("");
          setError(
            err.response?.data?.message || "Unable to verify your permissions.",
          );
        }
      } finally {
        if (!cancelled) {
          setCheckingRole(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function updateStatus(taskId, status) {
    if (!taskId || updatingTaskId) return;

    try {
      setUpdatingTaskId(taskId);
      setError("");

      await api.patch(
        `/projects/${workspaceId}/projects/${projectId}/tasks/${taskId}/status`,
        { status },
      );

      await fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update task status.");
    } finally {
      setUpdatingTaskId("");
    }
  }

  if (checkingRole || loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading project tasks...
      </div>
    );
  }

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <button
            type="button"
            onClick={() => navigate("/projects")}
            className="mb-2 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to projects
          </button>

          <h1 className="text-2xl font-semibold tracking-tight">
            Project Tasks
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage tasks, priorities, and progress for this project.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchTasks} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          {canAssignTasks && (
            <Button
              onClick={() =>
                navigate(
                  `/workspaces/${workspaceId}/projects/${projectId}/tasks/new`,
                )
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Create task
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {error}
            <button
              type="button"
              onClick={fetchTasks}
              className="ml-2 font-medium underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!canAssignTasks && userRole && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          You can view project tasks and update their status. Only HR and
          managers can create and assign tasks.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-medium">All tasks</h2>
          <span className="text-sm text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <ClipboardList className="h-7 w-7 text-muted-foreground" />
            </div>

            <h3 className="font-medium">No tasks yet</h3>

            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {canAssignTasks
                ? "Create your first task to start tracking work in this project."
                : "There are no tasks in this project yet. Ask HR or a manager to create one."}
            </p>

            {canAssignTasks && (
              <Button
                className="mt-4"
                onClick={() =>
                  navigate(
                    `/workspaces/${workspaceId}/projects/${projectId}/tasks/new`,
                  )
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Create your first task
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {tasks.map((task) => {
              const taskId = task._id || task.id;
              const status = task.status || "todo";

              return (
                <div
                  key={taskId}
                  className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/40 md:flex-row md:items-center md:justify-between"
                >
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
                      )
                    }
                    className="min-w-0 text-left"
                  >
                    <h3 className="truncate font-medium hover:underline">
                      {task.title}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {task.description || "No description provided"}
                    </p>

                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Due: {formatDate(task.dueDate)}
                    </p>
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`text-xs font-semibold uppercase ${
                        priorityStyles[task.priority] || priorityStyles.medium
                      }`}
                    >
                      {task.priority || "medium"}
                    </span>

                    <select
                      aria-label={`Status for ${task.title}`}
                      value={status}
                      disabled={updatingTaskId === taskId}
                      onChange={(event) =>
                        updateStatus(taskId, event.target.value)
                      }
                      className={`rounded-full border-0 px-3 py-1.5 text-xs font-medium outline-none disabled:opacity-50 ${
                        statusStyles[status] || statusStyles.todo
                      }`}
                    >
                      <option value="todo">To do</option>
                      <option value="in-progress">In progress</option>
                      <option value="in-review">In review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
