import { createBrowserRouter } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "../components/shared/ProtectedRoute";

import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";
import WorkspacesPage from "../features/workspaces/pages/WorkspacesPage";
import CreateWorkspacePage from "../features/workspaces/pages/CreateWorkspacePage";
import ProjectsPage from "@/features/projects/pages/ProjectsPage";
import CreateProjectPage from "@/features/projects/pages/CreateProjectPage";
import ProjectTasksPage from "@/features/tasks/pages/ProjectTasksPage";
import CreateTaskPage from "@/features/tasks/pages/CreateTaskPage";
import TaskDetailsPage from "@/features/tasks/pages/TaskDetailsPage";
import MyTasksPage from "@/features/tasks/pages/MyTasksPage";
import EditTaskPage from "@/features/tasks/pages/EditTaskPage";
import ProjectMembersPage from "@/features/projects/pages/ProjectMembersPage";
import TeamPage from "@/features/team/pages/TeamPage";

function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">We'll build this page later.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  // Public routes: no dashboard sidebar or header
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },

  // Protected routes: dashboard layout
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },

          {
            path: "projects",
            element: <ProjectsPage />,
          },
          {
            path: "workspaces/:workspaceId/projects/new",
            element: <CreateProjectPage />,
          },
          {
            path: "workspaces/:workspaceId/projects/:projectId/tasks",
            element: <ProjectTasksPage />,
          },
          {
            path: "workspaces/:workspaceId/projects/:projectId/tasks/new",
            element: <CreateTaskPage />,
          },
          {
            path: "workspaces/:workspaceId/projects/:projectId/tasks/:taskId",
            element: <TaskDetailsPage />,
          },
          {
            path: "tasks",
            element: <MyTasksPage />,
          },
          {
            path: "workspaces/:workspaceId/projects/:projectId/tasks/:taskId/edit",
            element: <EditTaskPage />,
          },
          {
            path: "team",
            element: <TeamPage />,
          },
          {
            path: "workspaces",
            element: <WorkspacesPage />,
          },
          {
            path: "workspaces/:workspaceId/projects/:projectId/members",
            element: <ProjectMembersPage />,
          },

          {
            path: "workspaces/new",
            element: <CreateWorkspacePage />,
          },
        ],
      },
    ],
  },
]);
