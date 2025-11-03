import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityBbsSystemAdmin {
  /**
   * Request DTO for creating a new system administrator. The server MUST hash
   * the provided plaintext password and persist it into the Prisma model
   * `community_bbs_systemadmin.password_hash`. This DTO maps to the Prisma
   * model `community_bbs_systemadmin` (x-autobe-prisma-schema). Required
   * fields: email and password. Optional fields: display_name and
   * is_super_admin (the latter must be set only by privileged callers).
   */
  export type ICreate = {
    /**
     * Administrator email address. Must be unique across system admins and
     * will be used for authentication and official notifications.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password. The server MUST hash this value using a secure
     * KDF before persisting it to the database (persisted column:
     * password_hash). Do NOT log this value. Password MUST follow platform
     * strength rules: minimum 8 characters and include at least one
     * lowercase letter, one uppercase letter, and one numeric digit.
     */
    password: string &
      tags.MinLength<8> &
      tags.Pattern<"(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+">;

    /** Optional human-friendly name for admin display in UIs and audit logs. */
    display_name?: string | undefined;

    /**
     * Optional flag indicating super-administrator privileges. This field
     * MUST only be set by privileged provisioning flows and will be ignored
     * or rejected for unprivileged callers.
     */
    is_super_admin?: boolean | undefined;
  };

  /**
   * Login request for system administrator. Contains credentials and required
   * session context fields (href and referrer). Do NOT include admin id
   * fields; authentication establishes actor identity.
   */
  export type ILogin = {
    /**
     * Administrator account email address used for authentication. Must
     * match an existing community_bbs_systemadmin.email record.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text administrator password (server will hash and verify
     * against community_bbs_systemadmin.password_hash). Clients MUST send
     * plain password; server handles hashing.
     */
    password: string;

    /**
     * Client IP address (optional). Server may capture this automatically;
     * clients may provide for SSR or proxy use cases.
     */
    ip?: string | undefined;

    /**
     * Connection URL (current page URL) - REQUIRED for session context and
     * audit. Used to populate community_bbs_systemadmin_sessions.href.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) - REQUIRED for session context and
     * audit. Used to populate community_bbs_systemadmin_sessions.referrer.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Minimal summary of a system administrator account used for attribution in
   * moderation metadata. Maps to Prisma model `community_bbs_systemadmin`.
   * Includes non-sensitive fields and role flag for UI/authorization.
   */
  export type ISummary = {
    /**
     * Unique identifier of the system administrator (maps to
     * community_bbs_systemadmin.id).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator display name for audit records and UI. Nullable when
     * not set.
     */
    display_name?: string | null | undefined;

    /**
     * Whether the system admin has super-administrator privileges. Maps to
     * community_bbs_systemadmin.is_super_admin. Useful for role-gating
     * admin-only operations.
     */
    is_super_admin?: boolean | undefined;

    /**
     * Account creation timestamp in ISO 8601 format (UTC). Maps to
     * community_bbs_systemadmin.created_at. Nullable in case of legacy
     * records without timestamp.
     */
    created_at?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Response returned after successful authentication or registration of a
   * system administrator. Includes the authenticated admin id, issued tokens,
   * and a sanitized admin summary. The admin object is intentionally required
   * to provide immediate actor context to clients while preventing exposure
   * of sensitive fields.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated system administrator
     * (community_bbs_systemadmin.id).
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Sanitized administrator summary. This MUST be a non-sensitive view
     * derived from the community_bbs_systemadmin row and MUST NOT include
     * authentication secrets (password_hash, password_reset_token_hash).
     * Use this object for UI context and role evaluation (e.g.,
     * is_super_admin).
     */
    admin: ICommunityBbsSystemAdmin.ISummary;
  };

  /**
   * Request DTO for exchanging a valid refresh token for a new access token
   * for the system administrator actor. The implementation MUST validate the
   * refresh token against the persisted session
   * (community_bbs_systemadmin_sessions), ensure the session is not expired
   * or revoked (expired_at null or in the future, not revoked), and verify
   * that the corresponding community_bbs_systemadmin account is active
   * (deleted_at == null) before issuing new tokens. Rotation of refresh
   * tokens is permitted and, if performed, MUST update the session row and
   * audit logs accordingly.
   */
  export type IRefresh = {
    /**
     * Opaque refresh token previously issued by the authentication service.
     * The server validates this token against the session store
     * (community_bbs_systemadmin_sessions) and uses it to issue a new
     * access token. Clients MUST provide the exact token value.
     */
    refresh_token: string;
  };
}
