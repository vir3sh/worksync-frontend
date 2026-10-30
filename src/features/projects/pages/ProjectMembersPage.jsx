import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, UserPlus, Users } from "lucide-react";
import api from "@/lib/api";

function getId(item) {
  return (
    item?._id || item?.id || item?.userId || item?.user?._id || item?.user?.id
  );
}

function getUser(item) {
  return item?.user || item;
}

function getName(item) {
  const user = getUser(item);
  return user?.name || user?.email || "Team member";
}

export default function ProjectMembersPage() {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();

  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const tasksUrl = `/tasks`;

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [workspaceResponse, projectResponse] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/members`),
        api.get(`/projects/${workspaceId}/projects/${projectId}/members`),
      ]);

      const workspaceData = workspaceResponse.data.data;
      const projectData = projectResponse.data.data;

      setWorkspaceMembers(
        Array.isArray(workspaceData)
          ? workspaceData
          : workspaceData?.members || [],
      );

      setProjectMembers(
        Array.isArray(projectData) ? projectData : projectData?.members || [],
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load project members.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const existingIds = new Set(
    projectMembers.map(getId).filter(Boolean).map(String),
  );

  const availableMembers = workspaceMembers.filter((member) => {
    const userId = getId(member);
    return userId && !existingIds.has(String(userId));
  });

  const handleAddMember = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedUserId) {
      setError("Please select a workspace member.");
      return;
    }

    try {
      setAdding(true);

      await api.post(`/projects/${workspaceId}/projects/${projectId}/members`, {
        userId: selectedUserId,
        role,
      });

      setSuccess("Member added to the project.");
      setSelectedUserId("");
      await loadMembers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add project member.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const userId = getId(member);

    if (!userId) {
      setError("Could not determine this member's user ID.");
      return;
    }

    if (!window.confirm(`Remove ${getName(member)} from this project?`)) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(
        `/projects/${workspaceId}/projects/${projectId}/members/${userId}`,
      );

      setSuccess("Member removed from the project.");
      await loadMembers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to remove project member.",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        Loading members...
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 p-6">
      <button
        onClick={() => navigate("/projects")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Project members
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who can collaborate on this project.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {success}
        </div>
      )}

      <form
        onSubmit={handleAddMember}
        className="space-y-4 rounded-xl border bg-card p-5"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          <h2 className="font-semibold">Add a member</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="member" className="text-sm font-medium">
              Workspace member
            </label>

            <select
              id="member"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              disabled={adding || availableMembers.length === 0}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Select a member</option>
              {availableMembers.map((member) => {
                const userId = getId(member);

                return (
                  <option key={userId} value={userId}>
                    {getName(member)}
                  </option>
                );
              })}
            </select>

            {availableMembers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No additional workspace members are available to add.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              Project role
            </label>

            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              disabled={adding}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            >
              <option value="member">Member</option>
              <option value="lead">Lead</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={adding || !selectedUserId}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {adding ? "Adding..." : "Add to project"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Users className="h-5 w-5" />
          <h2 className="font-semibold">
            Current members ({projectMembers.length})
          </h2>
        </div>

        {projectMembers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium">No project members yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a workspace member to start collaborating.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {projectMembers.map((member, index) => {
              const userId = getId(member);
              const user = getUser(member);

              return (
                <div
                  key={userId || index}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{getName(member)}</p>
                    {user?.email && (
                      <p className="truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      Role: {member.role || "member"}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveMember(member)}
                    className="shrink-0 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(tasksUrl)}
        className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Go to tasks
      </button>
    </section>
  );
}
