import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import api from "@/lib/api";

export default function EditTaskPage() {
  const { workspaceId, projectId, taskId } = useParams();
  const navigate = useNavigate();

  const tasksUrl = `/workspaces/${workspaceId}/projects/${projectId}/tasks`;

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTask() {
      try {
        setLoading(true);

        const response = await api.get(
          `/projects/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
        );

        const task = response.data.data;

        if (!cancelled) {
          setForm({
            title: task.title || "",
            description: task.description || "",
            priority: task.priority || "medium",
            dueDate: task.dueDate
              ? new Date(task.dueDate).toISOString().slice(0, 10)
              : "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Unable to load this task.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTask();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, projectId, taskId]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
    };

    if (payload.title.length < 2) {
      setError("Title must be at least 2 characters.");
      return;
    }

    if (
      payload.dueDate &&
      new Date(payload.dueDate) < new Date(Date.now() - 60000)
    ) {
      setError("Due date cannot be in the past.");
      return;
    }

    try {
      setSaving(true);

      await api.patch(
        `/projects/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
        payload,
      );

      navigate(`${tasksUrl}/${taskId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update task.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading task...
      </div>
    );
  }

  if (error && !form.title) {
    return (
      <section className="space-y-4 p-6">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <button
          onClick={() => navigate(tasksUrl)}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Back to tasks
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6">
      <button
        type="button"
        onClick={() => navigate(`${tasksUrl}/${taskId}`)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to task
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit task</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the task details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-card p-6"
      >
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Task title *
          </label>
          <input
            id="title"
            name="title"
            value={form.title}
            onChange={handleChange}
            minLength={2}
            maxLength={150}
            required
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            maxLength={3000}
            rows={5}
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="priority" className="text-sm font-medium">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="dueDate" className="text-sm font-medium">
              Due date
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-5">
          <button
            type="button"
            onClick={() => navigate(`${tasksUrl}/${taskId}`)}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
