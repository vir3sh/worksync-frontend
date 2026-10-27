import { useCallback, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  UserPlus,
  LoaderCircle,
  MailCheck,
  RefreshCw,
  Mail,
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function WorkspaceMembersPage() {
  const { workspaceId } = useParams();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  const fetchSentInvitations = useCallback(async () => {
    setLoadingInvitations(true);

    try {
      const response = await api.get(`/workspaces/${workspaceId}/invitations`);

      setSentInvitations(response.data?.data?.invitations ?? []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load sent invitations.",
      );
    } finally {
      setLoadingInvitations(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchSentInvitations();
  }, [fetchSentInvitations]);
  async function handleSendInvitation(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter the user's email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        `/workspaces/${workspaceId}/invitations`,
        {
          email: normalizedEmail,
          role,
        },
      );

      setSuccess(
        response.data?.message ||
          `Invitation sent to ${normalizedEmail} successfully.`,
      );

      setEmail("");
      setRole("employee");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to send the invitation. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page heading */}
      <div>
        <div className="mb-2 flex size-12 items-center justify-center rounded-xl border bg-muted/40">
          <UserPlus className="size-6 text-indigo-600" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Workspace Members</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Invite teammates to collaborate in this workspace.
        </p>
      </div>

      {/* Invitation form */}
      <form
        onSubmit={handleSendInvitation}
        className="space-y-6 rounded-xl border bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <MailCheck className="size-5" />
          </div>

          <div>
            <h2 className="font-semibold">Invite a teammate</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The invited user must have a registered account and accept the
              invitation before joining.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="memberEmail" className="text-sm font-medium">
            Email address
          </label>

          <input
            id="memberEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="employee@example.com"
            autoComplete="email"
            required
            disabled={loading}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="memberRole" className="text-sm font-medium">
            Workspace role
          </label>

          <select
            id="memberRole"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={loading}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>

          <p className="text-xs leading-5 text-muted-foreground">
            Assign the role the user will receive after accepting.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 size-4" />
            )}

            {loading ? "Sending invitation..." : "Send invitation"}
          </Button>
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Sent invitations</h2>
            <p className="text-sm text-muted-foreground">
              Track invitations sent to workspace members.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchSentInvitations}
            disabled={loadingInvitations}
          >
            <RefreshCw
              className={`mr-2 size-4 ${
                loadingInvitations ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>

        {loadingInvitations ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border p-8 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading invitations...
          </div>
        ) : sentInvitations.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Mail className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">No invitations sent yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Invitations you send will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            {sentInvitations.map((invitation) => {
              const status = invitation.status;

              const statusStyles = {
                pending: "bg-amber-50 text-amber-700 border-amber-200",
                accepted: "bg-green-50 text-green-700 border-green-200",
                declined: "bg-red-50 text-red-700 border-red-200",
                expired: "bg-muted text-muted-foreground border-border",
                revoked: "bg-muted text-muted-foreground border-border",
              };

              return (
                <div
                  key={invitation._id}
                  className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Mail className="size-5 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {invitation.invitedUser?.name ||
                          invitation.invitedUser?.email ||
                          "Unknown user"}
                      </p>

                      {invitation.invitedUser?.name &&
                        invitation.invitedUser?.email && (
                          <p className="truncate text-sm text-muted-foreground">
                            {invitation.invitedUser.email}
                          </p>
                        )}

                      <p className="mt-1 text-xs text-muted-foreground">
                        Role:{" "}
                        <span className="capitalize">{invitation.role}</span>
                        {" · "}
                        Sent{" "}
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                      statusStyles[status] ||
                      "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
