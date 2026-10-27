import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LoaderCircle, UserPlus, FolderKanban } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  const [form, setForm] = useState({
    name: "",
    description: "",
    priority: "medium",
    startDate: "",
    dueDate: "",
  });

  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaceMembers() {
      try {
        const response = await api.get(`/workspaces/${workspaceId}/members`);

        const data = response.data.data;
        const members = Array.isArray(data) ? data : data?.members || [];

        if (!cancelled) {
          setWorkspaceMembers(members);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load workspace members.",
          );
        }
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    }

    if (workspaceId) {
      loadWorkspaceMembers();
    } else {
      setLoadingMembers(false);
      setError("Workspace ID is missing.");
    }

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  function getUserId(member) {
    return (
      member?.user?._id ||
      member?.user?.id ||
      member?.userId?._id ||
      member?.userId ||
      member?._id ||
      member?.id
    );
  }

  function getMemberName(member) {
    const user = member?.user || member?.userId || member;

    return user?.name || user?.email || "Unknown user";
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function toggleMember(userId) {
    setSelectedMembers((current) => {
      const existing = current.find((member) => member.userId === userId);

      if (existing) {
        return current.filter((member) => member.userId !== userId);
      }

      return [...current, { userId, role: "member" }];
    });
  }

  function updateMemberRole(userId, role) {
    setSelectedMembers((current) =>
      current.map((member) =>
        member.userId === userId ? { ...member, role } : member,
      ),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setWarning("");

    const name = form.name.trim();
    const description = form.description.trim();

    if (name.length < 2 || name.length > 120) {
      setError("Project name must be between 2 and 120 characters.");
      return;
    }

    if (description.length > 2000) {
      setError("Description cannot exceed 2000 characters.");
      return;
    }

    if (form.startDate && form.dueDate && form.dueDate < form.startDate) {
      setError("Due date cannot be before the start date.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name,
        description,
        priority: form.priority,
        ...(form.startDate && {
          startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
        }),
        ...(form.dueDate && {
          dueDate: new Date(`${form.dueDate}T00:00:00`).toISOString(),
        }),
      };

      const response = await api.post(
        `/projects/${workspaceId}/projects`,
        payload,
      );

      const data = response.data.data;
      const project = data?.project || data;
      const projectId = project?._id || project?.id;

      if (!projectId) {
        setWarning(
          "The project may have been created, but its ID was not returned. Check your projects list before retrying.",
        );
        return;
      }

      const results = await Promise.allSettled(
        selectedMembers.map((member) =>
          api.post(`/projects/${workspaceId}/projects/${projectId}/members`, {
            userId: member.userId,
            role: member.role,
          }),
        ),
      );

      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;

      if (failedCount > 0) {
        navigate(`/workspaces/${workspaceId}/projects/${projectId}/members`, {
          state: {
            warning: `Project created, but ${failedCount} member(s) could not be added. Please review the project members.`,
          },
        });
        return;
      }

      navigate("/projects");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create project.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        type="button"
        variant="ghost"
        onClick={() => navigate("/projects")}
      >
        <ArrowLeft size={17} className="mr-2" />
        Back to projects
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your project and choose its initial members.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {warning && (
        <p
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {warning}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-white p-6"
      >
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Project name *
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={120}
            value={form.name}
            onChange={updateField}
            placeholder="Website redesign"
            className="h-10 w-full rounded-md border px-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            maxLength={2000}
            value={form.description}
            onChange={updateField}
            rows={4}
            placeholder="What is this project about?"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="priority" className="text-sm font-medium">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={form.priority}
            onChange={updateField}
            className="h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="startDate" className="text-sm font-medium">
              Start date
            </label>
            <input
              id="startDate"
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={updateField}
              className="h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dueDate" className="text-sm font-medium">
              Due date
            </label>
            <input
              id="dueDate"
              type="date"
              name="dueDate"
              min={form.startDate || undefined}
              value={form.dueDate}
              onChange={updateField}
              className="h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3 border-t pt-5">
          <div className="flex items-center gap-2">
            <UserPlus size={19} />
            <h2 className="font-semibold">Add project members</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            Select existing workspace members. You can also add members later
            from the project page.
          </p>

          {loadingMembers ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle size={16} className="animate-spin" />
              Loading workspace members...
            </p>
          ) : workspaceMembers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No workspace members were returned. Add users to this workspace
              first.
            </div>
          ) : (
            <div className="space-y-3">
              {workspaceMembers.map((member, index) => {
                const userId = getUserId(member);

                if (!userId) return null;

                const selected = selectedMembers.some(
                  (item) => item.userId === userId,
                );

                return (
                  <div
                    key={userId || index}
                    className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                  >
                    <input
                      type="checkbox"
                      id={`member-${userId}`}
                      checked={selected}
                      onChange={() => toggleMember(userId)}
                      className="size-4"
                    />

                    <label
                      htmlFor={`member-${userId}`}
                      className="min-w-0 flex-1 cursor-pointer text-sm font-medium"
                    >
                      {getMemberName(member)}
                    </label>

                    {selected && (
                      <select
                        aria-label={`Role for ${getMemberName(member)}`}
                        value={
                          selectedMembers.find((item) => item.userId === userId)
                            ?.role || "member"
                        }
                        onChange={(event) =>
                          updateMemberRole(userId, event.target.value)
                        }
                        className="h-9 rounded-md border px-2 text-sm"
                      >
                        <option value="member">Member</option>
                        <option value="lead">Lead</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {selectedMembers.length} member(s) selected
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t pt-5">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => navigate("/projects")}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <LoaderCircle size={17} className="mr-2 animate-spin" />
            ) : (
              <FolderKanban size={17} className="mr-2" />
            )}
            {submitting ? "Creating project..." : "Create project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
