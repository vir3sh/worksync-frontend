import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const initialForm = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
  assignedTo: "",
};

function getUserId(member) {
  const user = member?.user || member;
  return user?._id || user?.id || member?.userId || "";
}

function getMemberName(member) {
  const user = member?.user || member;
  return user?.name || user?.email || "Team member";
}

export default function CreateTaskPage() {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [userRole, setUserRole] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await api.get("/users/me");
        const data = response.data.data;
        const user = data?.user || data;

        if (!cancelled) {
          setUserRole(user?.role || "");
        }
      } catch {
        if (!cancelled) {
          setUserRole("");
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

  const tasksUrl = `/workspaces/${workspaceId}/projects/${projectId}/tasks`;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const fetchMembers = useCallback(async () => {
    try {
      setMembersLoading(true);
      setMembersError("");

      const response = await api.get(
        `/projects/${workspaceId}/projects/${projectId}/members`,
      );

      // The API payload is response.data.data.
      const data = response.data.data;
      const memberList = Array.isArray(data) ? data : data?.members || [];

      setMembers(memberList);
    } catch (err) {
      setMembersError(
        err.response?.data?.message || "Unable to load project members.",
      );
    } finally {
      setMembersLoading(false);
    }
  }, [workspaceId, projectId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const title = form.title.trim();
    const description = form.description.trim();

    if (title.length < 2) {
      setError("Task title must be at least 2 characters.");
      return;
    }

    if (title.length > 150) {
      setError("Task title cannot exceed 150 characters.");
      return;
    }

    if (description.length > 3000) {
      setError("Description cannot exceed 3000 characters.");
      return;
    }

    const dueDate = form.dueDate
      ? new Date(`${form.dueDate}T00:00:00`).toISOString()
      : null;

    if (dueDate && new Date(dueDate).getTime() < Date.now() - 60_000) {
      setError("Due date cannot be in the past.");
      return;
    }

    const payload = {
      title,
      description,
      priority: form.priority,
      dueDate,
      assignedTo: form.assignedTo || null,
    };

    try {
      setLoading(true);

      await api.post(
        `/projects/${workspaceId}/projects/${projectId}/tasks`,
        payload,
      );
      toast.success("Task created successfully!");

      navigate(tasksUrl);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create task. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingRole) {
    return <p className="p-6 text-sm">Checking permissions...</p>;
  }

  if (!["hr", "manager"].includes(userRole)) {
    return <Navigate to="/tasks" replace />;
  }
  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6">
      <button
        type="button"
        onClick={() => navigate(tasksUrl)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create task</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a task and assign it to a project member.
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
            placeholder="e.g. Design the dashboard"
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Maximum 150 characters.
          </p>
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
            placeholder="Describe what needs to be done..."
            className="w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
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
              min={new Date().toLocaleDateString("en-CA")}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="assignedTo" className="text-sm font-medium">
            Assign to
          </label>

          <select
            id="assignedTo"
            name="assignedTo"
            value={form.assignedTo}
            onChange={handleChange}
            disabled={membersLoading || Boolean(membersError)}
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {membersLoading
                ? "Loading members..."
                : membersError
                  ? "Members unavailable"
                  : "Unassigned"}
            </option>

            {members.map((member, index) => {
              const userId = getUserId(member);

              if (!userId) return null;

              return (
                <option key={userId || index} value={userId}>
                  {getMemberName(member)}
                </option>
              );
            })}
          </select>

          {membersLoading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Loading project members...
            </p>
          )}

          {membersError && (
            <div className="text-sm text-destructive">
              <p>{membersError}</p>
              <button
                type="button"
                onClick={fetchMembers}
                className="mt-1 underline"
              >
                Try again
              </button>
            </div>
          )}

          {!membersLoading && !membersError && members.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No project members found. You can create this task without an
              assignee.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t pt-5">
          <button
            type="button"
            onClick={() => navigate(tasksUrl)}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating..." : "Create task"}
          </button>
        </div>
      </form>
    </section>
  );
}
