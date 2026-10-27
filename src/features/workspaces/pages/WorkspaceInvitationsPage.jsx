import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Check, X, LoaderCircle, RefreshCw, Inbox } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function WorkspaceInvitationsPage() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/workspaces/invitations/pending");

      setInvitations(response.data?.data?.invitations ?? []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load invitations. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  async function handleInvitation(invitationId, action) {
    setProcessingId(invitationId);
    setError("");
    setNotice("");

    try {
      const response = await api.patch(
        `/workspaces/invitations/${invitationId}/${action}`,
      );

      setInvitations((current) =>
        current.filter((invitation) => invitation._id !== invitationId),
      );

      setNotice(
        response.data?.message ||
          (action === "accept"
            ? "Invitation accepted successfully."
            : "Invitation declined successfully."),
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to process this invitation. Please try again.",
      );

      // Refresh in case the invitation expired or was already processed.
      await fetchInvitations();
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl border bg-muted/40">
            <Mail className="size-5 text-indigo-600" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Invitations</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Review workspace invitations and choose whether to join.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={fetchInvitations}
          disabled={loading || processingId !== null}
        >
          <RefreshCw
            className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          Loading invitations...
        </div>
      ) : invitations.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
            <Inbox className="size-7 text-muted-foreground" />
          </div>

          <h2 className="font-semibold">No pending invitations</h2>

          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            When someone invites you to a workspace, the invitation will appear
            here.
          </p>

          <Button variant="outline" className="mt-4" onClick={fetchInvitations}>
            Check again
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {invitations.length} pending{" "}
            {invitations.length === 1 ? "invitation" : "invitations"}
          </div>

          {invitations.map((invitation) => {
            const workspace = invitation.workspace;
            const inviter = invitation.invitedBy;
            const isProcessing = processingId === invitation._id;

            return (
              <article
                key={invitation._id}
                className="rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Mail className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-semibold">
                        {workspace?.name || "Workspace"}
                      </h2>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Invited by{" "}
                        <span className="font-medium text-foreground">
                          {inviter?.name ||
                            inviter?.email ||
                            "A workspace admin"}
                        </span>
                      </p>

                      {inviter?.name && inviter?.email && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {inviter.email}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium capitalize">
                          {invitation.role}
                        </span>

                        {invitation.expiresAt && (
                          <span className="text-xs text-muted-foreground">
                            Expires{" "}
                            {new Date(
                              invitation.expiresAt,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {workspace?.description && (
                        <p className="mt-3 text-sm text-muted-foreground">
                          {workspace.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      disabled={processingId !== null}
                      onClick={() =>
                        handleInvitation(invitation._id, "decline")
                      }
                    >
                      {isProcessing ? (
                        <LoaderCircle className="mr-2 size-4 animate-spin" />
                      ) : (
                        <X className="mr-2 size-4" />
                      )}
                      Decline
                    </Button>

                    <Button
                      disabled={processingId !== null}
                      onClick={() => handleInvitation(invitation._id, "accept")}
                    >
                      {isProcessing ? (
                        <LoaderCircle className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 size-4" />
                      )}
                      Accept
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="border-t pt-4">
        <Link
          to="/workspaces"
          className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← Back to workspaces
        </Link>
      </div>
    </div>
  );
}
