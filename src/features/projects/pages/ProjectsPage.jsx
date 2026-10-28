import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  Plus,
  Trash2,
  LoaderCircle,
  CalendarDays,
  FolderOpenDot,
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [canCreateWorkspace, setCanCreateWorkspace] = useState(false);
  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaces() {
      try {
        const response = await api.get("/workspaces/my-workspaces");
        const items = response.data.data.workspaces;

        if (cancelled) return;

        setWorkspaces(items);

        if (items.length > 0) {
          setWorkspaceId(items[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load your workspaces.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await api.get("/users/me");

        setCanCreateWorkspace(
          response.data?.data?.user?.canCreateWorkspace === true,
        );
      } catch (err) {
        console.error("Unable to load workspace permissions:", err);
        setCanCreateWorkspace(false);
      }
    }

    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!workspaceId) {
      setProjects([]);
      return;
    }

    let cancelled = false;

    async function loadProjects() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/projects/${workspaceId}/projects`);

        if (!cancelled) {
          setProjects(response.data.data.projects);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Unable to load projects.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  async function handleDelete(projectId, projectName) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${projectName}"?`,
    );

    if (!confirmed) return;

    setDeletingId(projectId);
    setError("");

    try {
      await api.delete(`/projects/${workspaceId}/projects/${projectId}`);

      setProjects((current) =>
        current.filter((project) => project._id !== projectId),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete this project.");
    } finally {
      setDeletingId("");
    }
  }

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await api.get("/users/me");

        setCanCreateWorkspace(
          response.data?.data?.user?.canCreateWorkspace === true,
        );
      } catch (err) {
        console.error("Unable to load workspace permissions:", err);
        setCanCreateWorkspace(false);
      }
    }

    loadCurrentUser();
  }, []);
  const canCreateProject = ["hr", "manager"].includes(userRole);
  if (loading && workspaces.length === 0) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <LoaderCircle size={18} className="animate-spin" />
        Loading workspaces...
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex gap-2 items-center">
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
          >
            <Plus size={18} className="mr-2" />
            Create project
          </Button>
        )}
      </div>

      {workspaces.length > 0 && (
        <div className="max-w-sm space-y-2">
          <label htmlFor="workspace" className="text-sm font-medium">
            Workspace
          </label>

          <select
            id="workspace"
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
            className="h-10 w-full rounded-md border bg-white px-3 text-sm"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {workspaces.length === 0 && !error && (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center">
          <FolderKanban
            size={36}
            className="mx-auto mb-3 text-muted-foreground"
          />
          <h2 className="font-semibold">Not included in any Project</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Projects belong to a workspace.
          </p>

          {canCreateWorkspace && (
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

      {workspaceId && loading && (
        <p className="text-sm text-muted-foreground">Loading projects...</p>
      )}

      {workspaceId && !loading && !error && projects.length === 0 && (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center">
          <FolderKanban
            size={36}
            className="mx-auto mb-3 text-muted-foreground"
          />
          <h2 className="font-semibold">No projects yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first project to get started.
          </p>
          {workspaceId && canCreateProject && (
            <Button
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

      {!loading && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project._id || project.id}
              className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FolderKanban size={22} />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${project.name}`}
                  disabled={deletingId === project.id}
                  onClick={() =>
                    handleDelete(project._id || project.id, project.name)
                  }
                >
                  {deletingId === project.id ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Trash2 size={17} />
                  )}
                </Button>
              </div>

              <h2 className="mt-4 font-semibold">{project.name}</h2>

              <p className="mt-2 min-h-10 text-sm text-muted-foreground">
                {project.description || "No description provided."}
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() =>
                  navigate(
                    `/workspaces/${workspaceId}/projects/${project._id || project.id}/members`,
                  )
                }
              >
                Manage members
              </Button>

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
          ))}
        </div>
      )}
    </div>
  );
}
