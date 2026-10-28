import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  FolderOpenDot,
  Plus,
  Trash2,
  LoaderCircle,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const PROJECT_CREATION_ROLES = ["owner", "admin", "manager"];

export default function ProjectsPage() {
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [projects, setProjects] = useState([]);

  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [canCreateWorkspace, setCanCreateWorkspace] = useState(false);

  // Load workspaces available to the current user.
  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaces() {
      try {
        const response = await api.get("/workspaces/my-workspaces");
        const items = response.data?.data?.workspaces ?? [];

        if (cancelled) return;

        setWorkspaces(items);

        if (items.length > 0) {
          setWorkspaceId((currentId) => {
            // Keep the selected workspace if it still exists.
            const stillExists = items.some(
              (workspace) => workspace.id === currentId,
            );

            return stillExists ? currentId : items[0].id;
          });
        } else {
          setWorkspaceId("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load your workspaces.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingWorkspaces(false);
        }
      }
    }

    loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the current user's workspace-creation permission.
  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await api.get("/users/me");
        const user = response.data?.data?.user;

        if (!cancelled) {
          setCanCreateWorkspace(user?.canCreateWorkspace === true);
        }
      } catch (err) {
        console.error("Unable to load user permissions:", err);

        if (!cancelled) {
          setCanCreateWorkspace(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingPermissions(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load projects whenever the selected workspace changes.
  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      if (!workspaceId) {
        setProjects([]);
        setLoadingProjects(false);
        return;
      }

      setLoadingProjects(true);
      setError("");
      setProjects([]);

      try {
        const response = await api.get(`/projects/${workspaceId}/projects`);

        if (!cancelled) {
          setProjects(response.data?.data?.projects ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Unable to load projects.");
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
  }, [workspaceId]);

  // Find the currently selected workspace and its membership role.
  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId,
  );

  const workspaceRole = currentWorkspace?.role;

  const canCreateProject = ["owner", "admin", "manager"].includes(
    workspaceRole,
  );

  const handleDelete = useCallback(
    async (projectId, projectName) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${projectName}"?`,
      );

      if (!confirmed) return;

      setDeletingId(projectId);
      setError("");

      try {
        await api.delete(`/projects/${workspaceId}/projects/${projectId}`);

        setProjects((current) =>
          current.filter(
            (project) => (project._id || project.id) !== projectId,
          ),
        );
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to delete this project.",
        );
      } finally {
        setDeletingId("");
      }
    },
    [workspaceId],
  );

  const isLoading = loadingWorkspaces || loadingPermissions;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpenDot className="h-6 w-6 text-indigo-600" />

            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Organize work and track project progress.
          </p>
        </div>

        {workspaceId && canCreateProject && (
          <Button
            onClick={() => navigate(`/workspaces/${workspaceId}/projects/new`)}
            className="w-full sm:w-auto"
          >
            <Plus size={18} className="mr-2" />
            Create project
          </Button>
        )}
      </div>

      {/* Workspace selector */}
      {workspaces.length > 0 && (
        <div className="max-w-sm space-y-2">
          <label htmlFor="workspace" className="text-sm font-medium">
            Workspace
          </label>

          <select
            id="workspace"
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>

          {workspaceRole && (
            <p className="text-xs text-muted-foreground">
              Your role:{" "}
              <span className="font-medium capitalize">{workspaceRole}</span>
            </p>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Initial loading state */}
      {isLoading && workspaces.length === 0 && (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading workspaces...
        </div>
      )}

      {/* No workspaces */}
      {!loadingWorkspaces && workspaces.length === 0 && !error && (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <FolderKanban className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />

          <h2 className="font-semibold">No workspaces yet</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Projects belong to a workspace. Create one or ask a workspace owner
            to invite you.
          </p>

          {!loadingPermissions && canCreateWorkspace && (
            <Button
              className="mt-4"
              onClick={() => navigate("/workspaces/new")}
            >
              <Plus size={18} className="mr-2" />
              Create workspace
            </Button>
          )}
        </div>
      )}

      {/* Projects loading */}
      {workspaceId && loadingProjects && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading projects...
        </div>
      )}

      {/* Empty projects state */}
      {workspaceId && !loadingProjects && !error && projects.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <FolderKanban className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />

          <h2 className="font-semibold">No projects yet</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {canCreateProject
              ? "Create your first project to get started."
              : "There are no projects in this workspace yet. Ask an owner, admin, or manager to create one."}
          </p>

          {canCreateProject && (
            <Button
              className="mt-4"
              onClick={() =>
                navigate(`/workspaces/${workspaceId}/projects/new`)
              }
            >
              <Plus size={18} className="mr-2" />
              Create project
            </Button>
          )}
        </div>
      )}

      {/* Project cards */}
      {!loadingProjects && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const projectId = project._id || project.id;
            const isDeleting = deletingId === projectId;

            return (
              <article
                key={projectId}
                className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <FolderKanban size={22} />
                  </div>

                  {canCreateProject && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${project.name}`}
                      disabled={isDeleting}
                      onClick={() => handleDelete(projectId, project.name)}
                    >
                      {isDeleting ? (
                        <LoaderCircle size={17} className="animate-spin" />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </Button>
                  )}
                </div>

                <h2 className="mt-4 font-semibold">{project.name}</h2>

                <p className="mt-2 min-h-10 text-sm text-muted-foreground">
                  {project.description || "No description provided."}
                </p>

                {canCreateProject && (
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() =>
                      navigate(
                        `/workspaces/${workspaceId}/projects/${projectId}/members`,
                      )
                    }
                  >
                    Manage members
                  </Button>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">
                    {project.priority || "medium"} priority
                  </span>

                  {project.dueDate && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays size={14} />
                      {new Date(project.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
