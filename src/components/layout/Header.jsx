import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  Clock3,
  LoaderCircle,
  LogOut,
  Mail,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function formatNotificationDate(date) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  return value.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNotificationIcon(type) {
  switch (type) {
    case "task_assigned":
      return "New assignment";
    case "task_reassigned":
      return "Task reassigned";
    case "task_status_changed":
      return "Status updated";
    default:
      return "Notification";
  }
}

function getInitials(name = "") {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials.toUpperCase() || "U";
}

function formatRole(role = "") {
  if (!role) return "User";

  return role
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [readingId, setReadingId] = useState("");
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  // Load the currently authenticated user.
  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const response = await api.get("/users/me");

        if (!active) return;

        const currentUser = response.data?.data?.user;
        setUser(currentUser || null);
      } catch (err) {
        if (!active) return;

        console.error("Failed to load current user:", err);
        setUser(null);
      } finally {
        if (active) setUserLoading(false);
      }
    }

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  // Load notifications.
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/notifications", {
        params: { page: 1, limit: 20 },
      });

      const data = response.data?.data;
      const list = Array.isArray(data) ? data : [];

      setNotifications(list);
      setUnreadCount(
        Number(
          response.data?.unreadCount ??
            list.filter((item) => !item.isRead).length,
        ),
      );
    } catch (err) {
      console.error("Failed to load notifications:", err);

      setError(err.response?.data?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Close dropdowns when clicking outside.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Close dropdowns with Escape.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleNotifications = () => {
    const nextOpen = !isOpen;

    setIsOpen(nextOpen);
    setProfileOpen(false);

    if (nextOpen) {
      loadNotifications();
    }
  };

  const toggleProfile = () => {
    setProfileOpen((previous) => !previous);
    setIsOpen(false);
    setLogoutError("");
  };

  const markAsRead = async (notification) => {
    if (notification.isRead) {
      setIsOpen(false);
      navigate("/tasks");
      return;
    }

    const notificationId = notification._id || notification.id;

    if (!notificationId) return;

    setReadingId(notificationId);
    setError("");

    try {
      await api.patch(`/notifications/${notificationId}/read`);

      setNotifications((previous) =>
        previous.map((item) =>
          String(item._id || item.id) === String(notificationId)
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));

      setIsOpen(false);
      navigate("/tasks");
    } catch (err) {
      console.error("Failed to mark notification as read:", err);

      setError(
        err.response?.data?.message || "Unable to mark notification as read.",
      );
    } finally {
      setReadingId("");
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setError("");

    try {
      await api.patch("/notifications/read-all");

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);

      setError(
        err.response?.data?.message ||
          "Unable to mark all notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  // Log out the current user.
  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await api.post("/users/logout");

      setProfileOpen(false);
      setUser(null);

      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);

      setLogoutError(
        err.response?.data?.message || "Unable to log out. Please try again.",
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = user?.name || "My account";
  const displayEmail = user?.email || "";
  const displayRole = formatRole(user?.role);
  const initials = getInitials(user?.name);

  return (
    <header className="relative z-30 flex h-16 w-full items-center gap-2 border-b bg-white px-3 sm:gap-4 sm:px-6">
      {/* Mobile sidebar toggle */}

      {/* Search */}

      {/* Header actions */}
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
        <NavLink
          to="/invitations"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`
          }
        >
          <Mail className="size-4" />
          Invitations
        </NavLink>
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Notifications${
              unreadCount ? `, ${unreadCount} unread` : ""
            }`}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            onClick={toggleNotifications}
            className="relative"
          >
            <Bell size={19} />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>

          {isOpen && (
            <section
              role="dialog"
              aria-label="Notifications"
              className="absolute right-0 top-12 z-50 w-[min(92vw,400px)] overflow-hidden rounded-xl border bg-white shadow-xl"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <h2 className="font-semibold">Notifications</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {unreadCount} unread
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={markingAll}
                      onClick={markAllAsRead}
                      className="gap-1.5 text-xs"
                    >
                      {markingAll ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCheck className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden xs:inline">Mark all read</span>
                      <span className="xs:hidden">Read all</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Close notifications"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="border-b bg-red-50 px-4 py-2 text-xs text-red-700"
                >
                  {error}
                  <button
                    type="button"
                    className="ml-2 font-semibold underline"
                    onClick={loadNotifications}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Notification list */}
              <div className="max-h-[420px] overflow-y-auto">
                {loading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center px-4 py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <p className="font-medium">You're all caught up</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      New task updates will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const id = notification._id || notification.id;

                    return (
                      <button
                        type="button"
                        key={id}
                        disabled={readingId === id}
                        onClick={() => markAsRead(notification)}
                        className={`flex w-full items-start gap-3 border-b px-4 py-4 text-left transition hover:bg-muted/50 disabled:opacity-60 ${
                          notification.isRead ? "bg-white" : "bg-indigo-50/70"
                        }`}
                      >
                        <span
                          className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            notification.isRead
                              ? "bg-muted text-muted-foreground"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {readingId === id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-xs font-medium text-indigo-700">
                              {getNotificationIcon(notification.type)}
                            </span>

                            {!notification.isRead && (
                              <span
                                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600"
                                aria-label="Unread"
                              />
                            )}
                          </span>

                          <span className="mt-1 block text-sm font-semibold text-slate-900">
                            {notification.title}
                          </span>

                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {notification.message}
                          </span>

                          {notification.actor?.name && (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              From {notification.actor.name}
                            </span>
                          )}

                          <span className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock3 className="h-3 w-3" />
                            {formatNotificationDate(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="border-t bg-muted/20 p-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/tasks");
                  }}
                >
                  View my tasks
                </Button>
              </div>
            </section>
          )}
        </div>

        {/* User profile dropdown */}
        <div className="relative" ref={profileRef}>
          <Button
            type="button"
            variant="ghost"
            onClick={toggleProfile}
            aria-label="Open user menu"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex h-auto items-center gap-2 rounded-xl px-1.5 py-1.5 sm:px-2"
          >
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="bg-indigo-100 font-semibold text-indigo-700">
                {userLoading ? "…" : initials}
              </AvatarFallback>
            </Avatar>

            <span className="hidden max-w-32 text-left sm:block">
              <span className="block truncate text-sm font-semibold text-slate-800">
                {userLoading ? "Loading..." : displayName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {userLoading ? " " : displayRole}
              </span>
            </span>

            <ChevronDown
              size={16}
              className={`hidden text-muted-foreground transition-transform sm:block ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </Button>

          {profileOpen && (
            <div
              role="menu"
              aria-label="User menu"
              className="absolute right-0 top-12 z-50 w-[min(90vw,280px)] overflow-hidden rounded-xl border bg-white shadow-xl"
            >
              {/* User details */}
              <div className="border-b bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 shrink-0">
                    <AvatarFallback className="bg-indigo-100 font-semibold text-indigo-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {userLoading ? "Loading account..." : displayName}
                    </p>

                    {displayEmail && (
                      <p className="truncate text-xs text-muted-foreground">
                        {displayEmail}
                      </p>
                    )}

                    <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {displayRole}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account actions */}
              <div className="p-2">
                {logoutError && (
                  <p role="alert" className="px-3 py-2 text-xs text-red-600">
                    {logoutError}
                  </p>
                )}

                <button
                  type="button"
                  role="menuitem"
                  disabled={loggingOut}
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <LogOut size={17} />
                  )}

                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
