import { useEffect, useState } from "react";
import {
  CheckSquare,
  Clock,
  FolderKanban,
  Users,
  RefreshCw,
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaces() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/workspaces/my-workspaces");
        const items = response.data.data.workspaces;

        if (cancelled) return;

        setWorkspaces(items);

        if (items.length > 0) {
          setWorkspaceId((currentId) => {
            if (items.some((item) => item.id === currentId)) {
              return currentId;
            }

            return items[0].id;
          });
        } else {
          setWorkspaceId("");
          setDashboard(null);
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
    if (!workspaceId) return;

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      setDashboard(null);

      try {
        const response = await api.get(`/dashboard/workspaces/${workspaceId}`);

        if (!cancelled) {
          setDashboard(response.data.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load dashboard statistics.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const stats = dashboard
    ? [
        {
          title: "Total Projects",
          value: dashboard.projects.total,
          detail: `${dashboard.projects.active} active projects`,
          icon: FolderKanban,
        },
        {
          title: "Total Tasks",
          value: dashboard.tasks.total,
          detail: "Tasks in this workspace",
          icon: CheckSquare,
        },
        {
          title: "Completed Tasks",
          value: dashboard.tasks.completed,
          detail: "Successfully completed",
          icon: Clock,
        },
        {
          title: "Overdue Tasks",
          value: dashboard.tasks.overdue,
          detail: "Tasks past their due date",
          icon: Users,
        },
      ]
    : [];

  if (loading && !dashboard && workspaces.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading your workspace...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening in your workspace.
          </p>
        </div>

        {workspaces.length > 0 && (
          <select
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
            className="h-10 rounded-md border bg-white px-3 text-sm"
            aria-label="Select workspace"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWorkspaceId((id) => id)}
          >
            <RefreshCw size={15} className="mr-2" />
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && workspaces.length === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center">
          <FolderKanban
            className="mx-auto mb-3 text-muted-foreground"
            size={32}
          />
          <h2 className="font-semibold">No workspaces yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a workspace to start organizing projects and tasks.
          </p>
        </div>
      )}

      {loading && workspaces.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Loading dashboard data...
        </p>
      )}

      {!loading && !error && dashboard && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ title, value, detail, icon: Icon }) => (
              <div
                key={title}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {title}
                  </p>
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    <Icon size={19} />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold">{value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 lg:col-span-2">
              <h2 className="font-semibold">Workspace projects</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You have {dashboard.projects.total} projects
              </p>
            </div>

            <div className="rounded-xl border bg-white p-6">
              <h2 className="font-semibold">My tasks</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {dashboard.tasks.assignedToMe} tasks are assigned to you.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
