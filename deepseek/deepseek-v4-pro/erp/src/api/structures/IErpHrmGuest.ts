import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IErpHrmGuest {
  /**
   * Request body for refreshing an expiring or expired JWT access token.
   *
   * Presents a previously issued refresh token to obtain a new access token and a rotated refresh token. Each refresh token is single-use — a successful refresh invalidates the presented token and issues a new one, preventing replay attacks.
   *
   * The refresh operation extends the authenticated session without requiring the user to authenticate again. If the refresh token has already been used (rotated), is expired, or the associated member account has been deleted, the request is rejected with 401 Unauthorized.
   */
  export type IRefresh = {
    /**
     * The refresh token previously issued during join or a prior refresh operation.
     *
     * Identifies the member session to be extended. This token is single-use — after a successful refresh, the presented token becomes invalid and must be discarded. The server issues a new refresh token as part of the rotation strategy to prevent replay attacks.
     *
     * If this token has already been consumed by a previous refresh, is expired, or belongs to a deleted member account, the request will be rejected with 401 Unauthorized.
     *
         * @x-autobe-database-schema-property refresh_token
         * @x-autobe-specification Direct mapping from
         *   erp_hrm_member_sessions.refresh_token. This value is used to look
         *   up the member session record. The server reads this token to find
         *   the session, then rotates (replaces) it with a new refresh_token on
         *   successful refresh. The old token becomes invalid immediately after
         *   rotation.
     */
    refresh_token: string;
  };

  /**
   * JWT token pair issued upon successful authentication, enabling the client to make authenticated API requests.
   *
   * The id field identifies the authenticated member for client-side identity context. This is the member's unique identifier that persists across all organizations the member belongs to.
   *
   * The token field contains the access token (short-lived Bearer token for authenticating all subsequent API calls), the refresh token (longer-lived token used to obtain new access tokens without re-authentication), and expiration timestamps. Token rotation is enforced — each refresh operation consumes the previous refresh token and issues a new pair. The client should store both tokens securely and monitor the expiration timestamp to proactively refresh before expiration.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated member.
     *
     * The member's UUID primary key from the member accounts table. This identifier is consistent across all organizations the member belongs to and can be used by the client for identity context and subsequent profile lookups.
     *
         * @x-autobe-specification Maps from erp_hrm_members.id — the
         *   authenticated member's primary key (UUID) that uniquely identifies
         *   the member across all organizations. Set at session creation time
         *   from the member record that was created (join) or looked up
         *   (refresh). Validated during refresh: the member must exist and not
         *   be soft-deleted (deleted_at IS NULL).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
         * @x-autobe-specification Authorization token comes from the session
         *   table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Account registration credentials for creating a new member account.
   *
   * Provide an email address, password, and display name to register as a new member. The email must not already be registered — use the login endpoint if you already have an account. The password must be at least 8 characters long and contain at least one letter and one digit.
   *
   * Session context fields (href, referrer, ip) are captured for security and audit purposes. The href is the page URL where registration was initiated, and referrer is the HTTP Referer header. The ip field is optional and may be omitted when unavailable, such as in server-side rendering scenarios.
   *
   * Upon successful registration, a JWT token pair is returned in the response. Any pending organization invitations matching the registered email are automatically resolved.
   */
  export type IJoin = {
    /**
     * The email address for the new member account.
     *
     * Used as the primary contact identifier and authentication credential. Must be unique across the entire platform — an existing email indicates the user already has an account and should use the login endpoint instead.
     *
     * This email also serves as the target for organization invitations. If a pending invitation matches this email, the new member is automatically enrolled into the inviting organization with the role specified in the invitation upon successful registration.
     *
         * @x-autobe-specification Maps to erp_hrm_members.email column. Unique
         *   constraint enforced across all member accounts — return 409
         *   Conflict if email already registered with guidance to use login
         *   endpoint instead. Must be a valid email address format. Also serves
         *   as the target for pending invitation matching after account
         *   creation — invitations sent to this email address are automatically
         *   resolved, enrolling the new member into the inviting organizations.
     */
    email: string & tags.Format<"email">;

    /**
     * The password for the new member account.
     *
     * Must be at least 8 characters long and contain at least one letter and one digit. The password is hashed using a secure one-way algorithm (bcrypt or argon2id) before storage.
     *
     * Security: The password is never logged, never returned in any response, and never transmitted in plaintext after the initial registration request. Only the hashed representation is persisted in the database.
     *
         * @x-autobe-specification Maps to erp_hrm_members.password_hash column
         *   via bcrypt or argon2id one-way hashing. Validation: minimum 8
         *   characters, at least one letter and one digit — return 422
         *   Unprocessable Entity with specific strength requirements if not
         *   met. Security: never stored in plaintext; never logged; never
         *   returned in any response after the initial request. The plaintext
         *   password exists only in the request body during transmission.
     */
    password: string & tags.Format<"password">;

    /**
     * The visible display name for the new member.
     *
     * Shown across the platform as the member's identity in all organizations they belong to. Displayed in employee lists, project member views, task assignments, activity logs, and all other contexts where the member's identity is shown.
     *
     * Must be a non-empty string. Part of the global profile that is shared across all organizations.
     *
         * @x-autobe-specification Maps to erp_hrm_members.display_name column.
         *   Must be non-empty — return 422 Unprocessable Entity if missing or
         *   blank. Part of the global profile visible across all organizations
         *   the member belongs to. Displayed in employee lists, project member
         *   views, task assignments, activity logs, and all other contexts
         *   where the member's identity is shown.
     */
    display_name: string;

    /**
     * The full URL of the page from which the registration was initiated.
     *
     * Captured for security auditing purposes and stored in the session record created upon successful registration. Typically the registration page URL in the client application.
     *
     * Used alongside referrer and ip to establish the full context of the authentication event for security review and audit trails.
     *
         * @x-autobe-specification Maps to erp_hrm_member_sessions.href column.
         *   Captured at join time for security auditing. The full URL of the
         *   page from which the registration was initiated. Required field —
         *   must be present to establish the complete authentication context
         *   alongside referrer and ip.
     */
    href: string & tags.Format<"uri">;

    /**
     * The HTTP Referer header value captured at registration time.
     *
     * Indicates the page that referred the user to the registration flow. Captured for security auditing purposes and stored in the session record.
     *
     * Helps establish the navigation path that led to account creation, providing context for security review alongside href and ip.
     *
         * @x-autobe-specification Maps to erp_hrm_member_sessions.referrer
         *   column. Captured at join time for security auditing. The HTTP
         *   Referer header value indicating the page that referred the user to
         *   the registration flow. Required field.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * The client's IP address captured at registration time.
     *
     * Used for security auditing and stored in the session record created upon successful registration.
     *
     * This field is optional and may be omitted when the client IP address is unavailable, such as in server-side rendering scenarios where the client cannot determine its own IP. When omitted, the server captures the IP address from the incoming request as a fallback.
     *
     * Format: IPv4 address (e.g., "192.168.1.1").
     *
         * @x-autobe-specification Maps to erp_hrm_member_sessions.ip column.
         *   Optional — may be omitted in SSR scenarios where client IP is
         *   unavailable. When omitted, the server captures the IP from the
         *   incoming request context as fallback (body.ip ?? serverIp). Format:
         *   IPv4 address.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
