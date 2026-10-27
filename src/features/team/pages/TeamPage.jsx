import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  LoaderCircle,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

function getId(item) {
  return item?._id || item?.id || "";
}

function getUserId(member) {
  return member?.user?.id || member?.user?._id || member?.userId || "";
}

function getArray(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function roleClass(role) {
  const classes = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-indigo-100 text-indigo-700",
    manager: "bg-blue-100 text-blue-700",
    employee: "bg-slate-100 text-slate-700",
  };

  return classes[role] || "bg-muted text-muted-foreground";
}

export default function TeamPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");

  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingMemberId, setSavingMemberId] = useState("");

  const [roleChanges, setRoleChanges] = useState({});

  const canManageRoles = ["hr", "manager"].includes(userRole);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setLoading(true);
      setError("");

      try {
        const [userResponse, workspaceResponse] = await Promise.all([
          api.get("/users/me"),
          api.get("/workspaces/my-workspaces"),
        ]);

        if (cancelled) return;

        const currentUser = userResponse.data?.data?.user;
        const workspaceList = getArray(
          workspaceResponse.data?.data,
          "workspaces",
        );

        setUserRole(String(currentUser?.role || "").toLowerCase());
        setWorkspaces(workspaceList);

        if (workspaceList.length > 0) {
          setWorkspaceId((current) => current || getId(workspaceList[0]));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load your team information.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadMembers = useCallback(async () => {
    if (!workspaceId) {
      setMembers([]);
      return;
    }

    setLoadingMembers(true);
    setError("");
    setSuccess("");

    try {
      const [membersResponse, projectsResponse] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/members`),
        api.get(`/projects/${workspaceId}/projects`),
      ]);

      const workspaceMembers = getArray(membersResponse.data?.data, "members");

      const projects = getArray(projectsResponse.data?.data, "projects");

      // Fetch each project's members to build each person's project list.
      const projectMembershipResults = await Promise.allSettled(
        projects.map(async (project) => {
          const projectId = getId(project);

          const response = await api.get(
            `/projects/${workspaceId}/projects/${projectId}/members`,
          );

          const projectMembers = getArray(response.data?.data, "members");

          return projectMembers.map((projectMember) => ({
            userId: String(getUserId(projectMember)),
            project: {
              id: projectId,
              name: project.name || "Untitled project",
              role: projectMember.role || "member",
            },
          }));
        }),
      );

      const assignmentsByUser = new Map();

      projectMembershipResults.forEach((result) => {
        if (result.status !== "fulfilled") return;

        result.value.forEach(({ userId, project }) => {
          if (!userId) return;

          const existing = assignmentsByUser.get(userId) || [];
          existing.push(project);
          assignmentsByUser.set(userId, existing);
        });
      });

      const enrichedMembers = workspaceMembers.map((member) => {
        const userId = String(getUserId(member));

        return {
          ...member,
          userId,
          projects: assignmentsByUser.get(userId) || [],
        };
      });

      setMembers(enrichedMembers);

      // Discard any unsaved role selections for members no longer returned.
      setRoleChanges((previous) => {
        const next = {};

        enrichedMembers.forEach((member) => {
          if (Object.hasOwn(previous, member.userId)) {
            next[member.userId] = previous[member.userId];
          }
        });

        return next;
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load team members. Check your permissions.",
      );
    } finally {
      setLoadingMembers(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filteredMembers = members.filter((member) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    const name = member.user?.name || "";
    const email = member.user?.email || "";

    return (
      name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      member.projects.some((project) =>
        project.name.toLowerCase().includes(query),
      )
    );
  });

  const managerCount = members.filter(
    (member) => member.role === "manager",
  ).length;

  const employeeCount = members.filter(
    (member) => member.role === "employee",
  ).length;

  const handleRoleSelection = (userId, role) => {
    setRoleChanges((previous) => ({
      ...previous,
      [userId]: role,
    }));

    setSuccess("");
  };

  const saveRole = async (member) => {
    const userId = member.userId;
    const newRole = roleChanges[userId];

    if (!newRole || newRole === member.role) return;

    setSavingMemberId(userId);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/workspaces/${workspaceId}/members/${userId}/role`, {
        role: newRole,
      });

      setMembers((previous) =>
        previous.map((item) =>
          item.userId === userId ? { ...item, role: newRole } : item,
        ),
      );

      setRoleChanges((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });

      setSuccess(
        `${member.user?.name || "Member"}'s role was updated successfully.`,
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update this member's role.",
      );
    } finally {
      setSavingMemberId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Loading team...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight">Team members</h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            See who's on your team, review project assignments, and manage
            workspace roles.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <span className="capitalize">{userRole || "Member"} access</span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {workspaces.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="font-semibold">No workspaces found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Join a workspace to view its team members and projects.
          </p>
        </div>
      ) : (
        <>
          {/* Workspace selection */}
          <section className="rounded-xl border bg-card p-4 sm:p-5">
            <label
              htmlFor="teamWorkspace"
              className="mb-2 block text-sm font-medium"
            >
              Workspace
            </label>

            <div className="relative max-w-xl">
              <BriefcaseBusiness className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <select
                id="teamWorkspace"
                value={workspaceId}
                onChange={(event) => {
                  setWorkspaceId(event.target.value);
                  setRoleChanges({});
                }}
                className="h-11 w-full appearance-none rounded-lg border bg-background pl-10 pr-10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                {workspaces.map((workspace) => (
                  <option key={getId(workspace)} value={getId(workspace)}>
                    {workspace.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </section>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total members</p>
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="mt-3 text-3xl font-bold">{members.length}</p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Managers</p>
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-3xl font-bold">{managerCount}</p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Employees</p>
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <p className="mt-3 text-3xl font-bold">{employeeCount}</p>
            </div>
          </div>

          {/* Search and list */}
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  People in this workspace
                </h2>
                <p className="text-sm text-muted-foreground">
                  {filteredMembers.length} member
                  {filteredMembers.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search people or projects..."
                  className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {loadingMembers ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border bg-card py-14 text-sm text-muted-foreground">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Loading members and project assignments...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center">
                <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                <h3 className="font-semibold">No members found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try another search or select a different workspace.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => {
                  const userId = member.userId;
                  const name = member.user?.name || "Unnamed member";
                  const email = member.user?.email || "";
                  const selectedRole = roleChanges[userId] ?? member.role;
                  const roleChanged = selectedRole !== member.role;
                  const isSaving = savingMemberId === userId;

                  return (
                    <article
                      key={userId}
                      className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        {/* Member identity */}
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                            {getInitials(name)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold">{name}</h3>
                            <p className="mt-0.5 break-all text-sm text-muted-foreground">
                              {email}
                            </p>

                            <span
                              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${roleClass(member.role)}`}
                            >
                              {member.role}
                            </span>
                          </div>
                        </div>

                        {/* Role management */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end xl:min-w-[330px]">
                          <div className="flex-1 space-y-1.5">
                            <label
                              htmlFor={`role-${userId}`}
                              className="text-xs font-medium text-muted-foreground"
                            >
                              Workspace role
                            </label>

                            <select
                              id={`role-${userId}`}
                              value={selectedRole}
                              disabled={!canManageRoles || isSaving}
                              onChange={(event) =>
                                handleRoleSelection(userId, event.target.value)
                              }
                              className="h-10 w-full rounded-lg border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {member.role === "owner" && (
                                <option value="owner">Owner</option>
                              )}

                              {ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {canManageRoles && roleChanged && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveRole(member)}
                                disabled={isSaving}
                                className="gap-1.5"
                              >
                                {isSaving ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Save
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isSaving}
                                onClick={() =>
                                  setRoleChanges((previous) => {
                                    const next = { ...previous };
                                    delete next[userId];
                                    return next;
                                  })
                                }
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Project assignments */}
                      <div className="mt-5 border-t pt-4">
                        <div className="mb-3 flex items-center gap-2">
                          <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-semibold">
                            Assigned projects
                          </h4>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {member.projects.length}
                          </span>
                        </div>

                        {member.projects.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            This member isn't assigned to any projects in this
                            workspace.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {member.projects.map((project) => (
                              <div
                                key={project.id}
                                className="inline-flex max-w-full items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                              >
                                <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                                <span className="truncate text-sm">
                                  {project.name}
                                </span>
                                <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-xs capitalize text-muted-foreground">
                                  {project.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {!canManageRoles && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Only HR and managers can change workspace roles.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
