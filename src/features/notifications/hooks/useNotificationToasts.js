import { useEffect, useRef } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function useNotificationToasts() {
  const knownIds = useRef(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    let active = true;
    let intervalId;

    const fetchNotifications = async () => {
      try {
        const response = await api.get("/notifications");
        const notifications = response.data?.data ?? [];

        if (!active || !Array.isArray(notifications)) return;

        // Initial fetch: remember existing notifications without toasts.
        if (!initialized.current) {
          notifications.forEach((notification) => {
            const id = notification._id ?? notification.id;
            if (id != null) knownIds.current.add(String(id));
          });

          initialized.current = true;
          return;
        }

        // Later fetches: toast only for newly received notifications.
        for (const notification of notifications) {
          const rawId = notification._id ?? notification.id;
          if (rawId == null) continue;

          const id = String(rawId);
          if (knownIds.current.has(id)) continue;

          knownIds.current.add(id);

          if (!notification.isRead) {
            toast(notification.title || "New notification", {
              description: notification.message || "",
              duration: 5000,
            });
          }
        }
      } catch (error) {
        console.error(
          "Notification fetch failed:",
          error.response?.data || error.message,
        );
      }
    };

    fetchNotifications();
    intervalId = setInterval(fetchNotifications, 60 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);
}
