import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil, RefreshCw } from "lucide-react";
import api from "@/lib/api";

const statuses = [
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "in-review", label: "In review" },
  { value: "completed", label: "Completed" },
];

function formatDate(date) {
  if (!date) return "Not set";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TaskDetailsPage() {
  const { workspaceId, projectId, taskId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [workspaceRole, setWorkspaceRole] = useState("");

  const tasksUrl = `/workspaces/${workspaceId}/projects/${projectId}/tasks`;

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/projects/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
      );

      setTask(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load task details.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleStatusChange = async (event) => {
    const status = event.target.value;

    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/projects/${workspaceId}/projects/${projectId}/tasks/${taskId}/status`,
        { status },
      );

      setTask((previous) => ({ ...previous, status }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update task status.");
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaceRole() {
      try {
        const response = await api.get("/workspaces/my-workspaces");
        const workspaces = response.data?.data?.workspaces ?? [];

        const currentWorkspace = workspaces.find(
          (workspace) => String(workspace.id) === String(workspaceId),
        );

        if (!cancelled) {
          setWorkspaceRole(currentWorkspace?.role || "");
        }
      } catch (err) {
        console.error("Unable to load workspace role:", err);

        if (!cancelled) {
          setWorkspaceRole("");
        }
      }
    }

    loadWorkspaceRole();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading task...
      </div>
    );
  }

  if (!task) {
    return (
      <section className="space-y-4 p-6">
        <p role="alert" className="text-sm text-destructive">
          {error || "Task not found."}
        </p>
        <button
          onClick={fetchTask}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Retry
        </button>
        <button
          onClick={() => navigate(tasksUrl)}
          className="ml-2 rounded-lg border px-4 py-2 text-sm"
        >
          Back to tasks
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6">
      <button
        onClick={() => navigate(tasksUrl)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Task details
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {task.title}
            </h1>
          </div>

          <span className="h-fit rounded-full bg-muted px-3 py-1 text-xs font-medium">
            {task.priority || "medium"} priority
          </span>
        </div>

        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-medium">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {task.description || "No description provided."}
          </p>
        </div>

        <div className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="taskStatus"
                className="text-sm font-semibold text-foreground"
              >
                Status
              </label>

              {workspaceRole !== "employee" && workspaceRole !== "" && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/edit`,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit task
                </button>
                
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                id="taskStatus"
                value={task.status || "todo"}
                onChange={handleStatusChange}
                disabled={saving}
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Due date</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(task.dueDate)}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Assigned to</p>
            <p className="break-all text-sm text-muted-foreground">
              {typeof task.assignedTo === "object"
                ? task.assignedTo?.name || "Unassigned"
                : task.assignedTo || "Unassigned"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Created</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(task.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
