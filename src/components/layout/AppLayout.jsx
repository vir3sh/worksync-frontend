import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";

import Sidebar from "./Sidebar";
import Header from "./Header";
import useNotificationToasts from "@/features/notifications/hooks/useNotificationToasts";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useNotificationToasts();

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Keep your existing header and add the mobile menu button */}
        <div className="flex min-w-0 items-center border-b">
          <button
            type="button"
            aria-label="Open sidebar"
            aria-controls="app-sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
            className="ml-3 inline-flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-muted md:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0 flex-1">
            <Header />
          </div>
        </div>

        {/* Preserve your original p-6 spacing */}
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
