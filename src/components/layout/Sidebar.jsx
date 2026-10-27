import { NavLink } from "react-router-dom";
import {
  CheckCheck,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  CircleHelp,
  BriefcaseBusiness,
  X,
} from "lucide-react";

const navigation = [
  { name: "Overview", path: "/", icon: LayoutDashboard },
  { name: "Projects", path: "/projects", icon: FolderKanban },
  { name: "My Tasks", path: "/tasks", icon: CheckSquare },
  { name: "Team", path: "/team", icon: Users },
  {
    name: "Workspaces",
    path: "/workspaces",
    icon: BriefcaseBusiness,
  },
];

export default function Sidebar({ open = false, onClose = () => {} }) {
  return (
    <aside
      id="app-sidebar"
      aria-label="Main navigation"
      className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] shrink-0 flex-col border-r bg-white transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:w-64 md:max-w-none md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <CheckCheck size={21} />
          </div>

          <span className="text-xl font-bold tracking-tight">TaskFlow</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map(({ name, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span>{name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom links */}
    </aside>
  );
}
