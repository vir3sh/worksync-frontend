import { useEffect, useState } from "react";
import { Plus, FolderKanban, LoaderCircle, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const canCreateWorkspace = ["hr", "manager"].includes(userRole);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        const [workspacesResponse, userResponse] = await Promise.all([
          api.get("/workspaces/my-workspaces"),
          api.get("/users/me"),
        ]);

        if (cancelled) return;

        setWorkspaces(workspacesResponse.data?.data?.workspaces || []);
        setUserRole(userResponse.data?.data?.user?.role || "");
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

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Organize your projects and collaborate with your team.
          </p>
        </div>

        {/* Only HR and Manager can create workspaces */}
        {canCreateWorkspace && (
          <Button onClick={() => navigate("/workspaces/new")}>
            <Plus size={18} className="mr-2" />
            Create workspace
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" size={18} />
          Loading workspaces...
        </div>
      ) : workspaces.length === 0 && !error ? (
        /* Empty state */
        <div className="rounded-xl border border-dashed bg-white px-6 py-14 text-center">
          <FolderKanban
            className="mx-auto mb-4 text-muted-foreground"
            size={36}
          />

          <h2 className="text-lg font-semibold">No workspaces yet</h2>

          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {canCreateWorkspace
              ? "Create your first workspace to start managing projects and tasks."
              : "You haven't been added to any workspace yet. Contact your HR or manager to get access."}
          </p>

          {/* Only HR and Manager see this button */}
          {canCreateWorkspace && (
            <Button
              className="mt-5"
              onClick={() => navigate("/workspaces/new")}
            >
              <Plus size={18} className="mr-2" />
              Create workspace
            </Button>
          )}
        </div>
      ) : (
        /* Workspace list */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FolderKanban size={22} />
              </div>

              <h2 className="font-semibold">{workspace.name}</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {workspace.description || "No description provided."}
              </p>

              <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
                <Button
                  variant="outline"
                  className="mt-4 w-50 "
                  onClick={() =>
                    navigate(`/workspaces/${workspace.id}/members`)
                  }
                >
                  <UserPlus size={17} className="mr-2" />
                  Manage members
                </Button>
                {/* <span className="capitalize">{workspace.role}</span> */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
