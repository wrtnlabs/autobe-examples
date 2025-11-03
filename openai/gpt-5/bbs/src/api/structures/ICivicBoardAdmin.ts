import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { IECivicBoardAdminSecurityOperation } from "./IECivicBoardAdminSecurityOperation";

export namespace ICivicBoardAdmin {
  /**
   * Authorized administrator response object returned by authentication flows
   * (join, login, refresh). It carries the admin actor's unique id from
   * civic_board_admins.id and a structured token bundle for subsequent
   * authenticated requests. The admin property provides a concise profile
   * based on civic_board_admins while excluding sensitive fields such as
   * password_hash.
   *
   * This DTO is not a direct table mapping. It aggregates data from
   * civic_board_admins and ephemeral authorization services (JWT issuance)
   * and is used as the canonical response body for admin authentication
   * operations.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated administrator. Maps to
     * civic_board_admins.id (UUID).
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Profile summary of the authenticated administrator. Derived from
     * civic_board_admins with sensitive credentials excluded (no
     * password_hash).
     */
    admin: ICivicBoardAdmin.ISummary;
  };

  /**
   * Lightweight administrator reference used in other entities’ summaries.
   * Fields map to civic_board_admins. Excludes authentication secrets and
   * internal tokens by design. Includes created_at for audit/sorting parity
   * with user summaries.
   */
  export type ISummary = {
    /** Unique identifier of the admin. Maps to civic_board_admins.id. */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator display name shown in audit trails and moderation
     * records. Maps to civic_board_admins.display_name.
     */
    display_name: string;

    /**
     * Indicates whether the admin’s email was verified. Maps to
     * civic_board_admins.email_verified.
     */
    email_verified: boolean;

    /**
     * Whether the admin account is suspended from taking privileged
     * actions. Maps to civic_board_admins.suspended.
     */
    suspended: boolean;

    /**
     * Administrator account creation timestamp (UTC). Maps to
     * civic_board_admins.created_at. Useful for audit context and sorting.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Generic security outcome for administrator-focused flows. Aggregates side
   * effects recorded in Prisma models such as civic_board_admins
   * (email_verified, password_hash), civic_board_admin_sessions (expired_at),
   * and the audit table civic_board_audit_logs. The operation field is
   * constrained by IEAdminSecurityOperation to ensure consistency across
   * integrations; occurred_at is required for predictable timelines. No
   * password material or tokens are ever returned in this type.
   */
  export type ISecurityOutcome = {
    /**
     * Indicates whether the requested security operation completed
     * successfully. This covers flows such as email verification, password
     * reset, password change, logout, and session revocation described for
     * civicBoard administrators.
     */
    success: boolean;

    /**
     * Logical name of the operation that produced this outcome. Constrained
     * to IEAdminSecurityOperation for predictable client handling.
     */
    operation: IECivicBoardAdminSecurityOperation;

    /**
     * Identifier of the affected administrator (civic_board_admins.id).
     * Returned for correlation and client-side routing. Never includes
     * sensitive fields like password_hash.
     */
    admin_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * When present, reflects the administrator’s current email verification
     * status after processing. For example, set to true on successful
     * verification using civic_board_email_verifications and
     * civic_board_email_verification_of_admins.
     */
    email_verified?: boolean | undefined;

    /**
     * When present, indicates a password rotation occurred (e.g., via
     * password reset or password change). The underlying prisma model
     * column updated is civic_board_admins.password_hash; the clear-text
     * password is never exposed in responses.
     */
    password_rotated?: boolean | undefined;

    /**
     * When present, the number of administrator sessions that were ended by
     * setting expired_at on civic_board_admin_sessions as part of the
     * operation (e.g., password reset or explicit session revocation).
     */
    sessions_revoked?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /**
     * When true, indicates the caller’s current session was terminated
     * (logout flow).
     */
    session_expired?: boolean | undefined;

    /**
     * Human-friendly summary of the outcome suitable for UI display. Does
     * not expose internal details or secrets.
     */
    message?: string | undefined;

    /**
     * UTC timestamp when the operation was finalized on the server.
     * Provided for audit-friendly client UX. The authoritative audit trail
     * is recorded in civic_board_audit_logs.
     */
    occurred_at: string & tags.Format<"date-time">;
  };
}
