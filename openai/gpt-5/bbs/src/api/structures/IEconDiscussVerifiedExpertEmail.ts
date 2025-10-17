import { tags } from "typia";

export namespace IEconDiscussVerifiedExpertEmail {
  /**
   * Send-verification request payload for the verified expert email flow.
   *
   * This DTO is used by the endpoint that sends a verification email for an
   * account represented in the Actors namespace (Prisma model
   * econ_discuss_users). It does not write to the database; it only instructs
   * the system to dispatch a message. The database column that ultimately
   * reflects ownership confirmation is econ_discuss_users.email_verified
   * (Boolean).
   */
  export type IRequest = {
    /**
     * Preferred locale for the verification email content.
     *
     * This value is used only for message localization and does not alter
     * any database state. Common values follow BCP 47 (e.g., "en-US").
     */
    locale?: string | undefined;

    /**
     * Optional callback/return URI to embed in the verification link so
     * that the client can resume a specific in-app or web flow after
     * verification.
     *
     * This field is transport-only and is not persisted in the database. It
     * is useful when orchestrating deep-links after flipping
     * econ_discuss_users.email_verified.
     */
    redirect_uri?: (string & tags.Format<"uri">) | undefined;
  };

  /**
   * Acknowledgement payload for a verification email dispatch request.
   *
   * This DTO confirms the send attempt for the verified expert email flow. It
   * does not expose sensitive data. The authoritative verification state is
   * stored in Prisma model econ_discuss_users via the email_verified Boolean
   * and updated_at timestamp.
   */
  export type ISent = {
    /**
     * Indicates whether the verification email task was accepted and queued
     * for delivery.
     *
     * When true, the provider has accepted the dispatch request and the
     * message will be sent according to policy and rate limits.
     */
    queued: boolean;

    /**
     * Timestamp (ISO 8601, UTC) when this verification dispatch was
     * accepted.
     *
     * This timestamp is not a Prisma column; it is returned for client
     * diagnostics and timeline rendering.
     */
    requested_at: string & tags.Format<"date-time">;

    /**
     * When present, indicates the earliest time a subsequent resend would
     * be accepted if the caller is currently rate-limited.
     *
     * This value is not persisted in any econ_discuss_* table; it reflects
     * provider policy state at the time of the request.
     */
    rate_limit_reset_at?:
      | (string & tags.Format<"date-time">)
      | null
      | undefined;
  };

  /**
   * Verification outcome payload for the verified expert email flow.
   *
   * It reflects the user’s email ownership status as stored in
   * econ_discuss_users (email_verified Boolean) and returns the time of
   * verification for client UX and auditing.
   */
  export type IVerified = {
    /**
     * Resulting verification state after processing the token.
     *
     * This mirrors the econ_discuss_users.email_verified column and is
     * expected to be true on successful verification; it may already have
     * been true for idempotent replays.
     */
    email_verified: boolean;

    /**
     * Timestamp (ISO 8601, UTC) when the system recorded the verified state
     * for this account.
     *
     * This corresponds to the moment the service set
     * econ_discuss_users.email_verified=true and updated
     * econ_discuss_users.updated_at.
     */
    verified_at: string & tags.Format<"date-time">;
  };
}
