import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { IEconPoliticalForumRegisteredUser } from "./IEconPoliticalForumRegisteredUser";
import { IPageIPagination } from "./IPageIPagination";

export namespace IEconPoliticalForumAdministrator {
  /**
   * Administrator registration request.
   *
   * This DTO is used to create a new `econ_political_forum_registereduser`
   * row for an administrator account. The client provides the administrator's
   * contact (email) and a plain-text password; the server computes and stores
   * the `password_hash` in the Prisma model. The DTO maps directly to the
   * Prisma model fields and therefore includes an x-autobe-prisma-schema
   * linkage.
   *
   * Security note: Do not include `password_hash` or any derived secrets in
   * requests or responses. The server will handle hashing, session creation
   * (econ_political_forum_sessions), and verification flows.
   */
  export type IJoin = {
    /**
     * Registered administrator email address. Maps to
     * `econ_political_forum_registereduser.email` in the Prisma schema.
     *
     * This field is required for account creation and will be used for
     * verification and password recovery flows. The server enforces
     * uniqueness against the database constraint and will return 409
     * Conflict on collision.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password supplied by the client for initial account
     * creation.
     *
     * This value MUST be sent in plain text over TLS; the server is
     * responsible for hashing and storing the result in
     * `econ_political_forum_registereduser.password_hash`. Clients MUST NOT
     * send pre-hashed passwords. Password strength is enforced server-side
     * (recommended minimum 10 characters).
     */
    password: string & tags.MinLength<10>;

    /**
     * Unique account username corresponding to
     * `econ_political_forum_registereduser.username` in Prisma.
     *
     * The server enforces uniqueness. Use lower-case normalization for
     * lookup where appropriate. This property is optional at creation time
     * but recommended for administrator accounts.
     */
    username?: (string & tags.MinLength<3> & tags.MaxLength<30>) | undefined;

    /**
     * Optional human-friendly display name mapped to
     * `econ_political_forum_registereduser.display_name`.
     *
     * Used for presentation only and not required to be unique. May be
     * omitted; server will store null when not provided.
     */
    display_name?: (string & tags.MaxLength<100>) | undefined;
  };

  /**
   * Authorization response returned after successful administrator
   * authentication or registration.
   *
   * This DTO includes the administrator's stable identifier and a token
   * container used for authenticated requests. It references the
   * registered-user summary for convenience but intentionally excludes any
   * sensitive fields. The x-autobe-prisma-schema links this type to the
   * underlying Prisma model to enable automated schema/property verification
   * against the database.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authorized administrator account. Maps to
     * `econ_political_forum_registereduser.id` in the Prisma schema.
     *
     * This identifier is returned so clients can correlate authentication
     * state with server-side identity records. It MUST be a UUID.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Optional minimal public summary of the authenticated administrator
     * account.
     *
     * This property references the registered user summary DTO and maps to
     * public-safe fields only. It MUST NOT include secrets such as
     * `password_hash`, `failed_login_attempts`, or `locked_until`.
     */
    user?: IEconPoliticalForumRegisteredUser.ISummary | undefined;
  };

  /**
   * Login request for an administrator account. The request contains
   * credentials used to authenticate an administrator. The server validates
   * the credentials against the registered user record and issues
   * access/refresh tokens on success.
   *
   * Fields:
   *
   * - UsernameOrEmail: The account username or the verified email address.
   * - Password: Plain-text password for authentication.
   *
   * Security: Do NOT include sensitive fields in responses. This DTO is a
   * request-only object and does not persist to the database as-is.
   */
  export type ILogin = {
    /**
     * Username or email address used to authenticate. Accepts the account's
     * username OR the verified email address.
     */
    usernameOrEmail: string & tags.MinLength<1>;

    /**
     * Plain-text password supplied by the user for authentication. The
     * server will hash and validate it; clients MUST not send a hashed
     * password. Recommended minimum length: 10 characters.
     */
    password: string & tags.MinLength<10>;
  };

  /**
   * Refresh request for administrator sessions. The client supplies a
   * refresh_token to obtain a new short-lived access token and a rotated
   * refresh token. The server validates the token (and the underlying
   * session) and returns a new authorization payload on success.
   */
  export type IRefresh = {
    /**
     * Refresh token previously issued by an authentication flow. This token
     * is exchanged for a new access token and a rotated refresh token.
     * Implementations MUST validate token integrity and expiry before
     * issuing new tokens.
     */
    refresh_token: string & tags.MinLength<1>;
  };

  /**
   * Request DTO for initiating a password reset for an administrator account.
   *
   * This payload contains the email address of the account that will receive
   * a single-use password reset link. The server uses this value to create an
   * entry in the `econ_political_forum_password_resets` table
   * (reset_token_hash, expires_at, created_at) and to send the reset email.
   * For security, the system must only store a hash of any generated token
   * and must not expose account existence in the public response.
   *
   * Business rules:
   *
   * - The email must conform to standard email address format and match the
   *   `econ_political_forum_registereduser.email` column when present.
   * - The API should accept the email and always return a generic
   *   acknowledgement to the caller regardless of whether a matching account
   *   exists, to prevent account enumeration.
   */
  export type IRequestPasswordReset = {
    /**
     * Verified email address of the target registered user as stored in
     * econ_political_forum_registereduser.email.
     *
     * This property is used to locate the account that will receive the
     * password reset link. The API MUST treat this value as
     * case-insensitive for lookup and MUST NOT disclose whether the email
     * exists in user-facing messages to avoid account enumeration.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Acknowledgement response returned after requesting a password reset.
   *
   * This response confirms that the system has accepted the request for
   * processing. For security and privacy reasons the response should never
   * reveal whether an account exists for the provided email address. When
   * present, `request_id` is a server-side correlation identifier (UUID) that
   * can be used for support and audit lookup.
   *
   * Example usage:
   *
   * - Success = true, message = "If an account exists for the provided email, a
   *   reset link has been sent."
   */
  export type IResetRequestResponse = {
    /**
     * Indicates whether the password reset request was accepted for
     * processing. True when the request has been queued or processed; the
     * response does not confirm the existence of an account to callers.
     */
    success: boolean;

    /**
     * Human-readable message describing outcome. For public safety returns
     * a generic message such as 'If an account exists for the provided
     * email, a reset link has been sent.' Include guidance about next steps
     * without revealing account presence.
     */
    message: string;

    /**
     * Optional server-generated correlation id for this request useful for
     * support and audit logs. Present when the server wants to provide a
     * reference for follow-up; format is UUID.
     */
    request_id?: (string & tags.Format<"uuid">) | undefined;
  };

  /**
   * Request object for confirming a password reset for an administrator
   * account.
   *
   * This DTO is used by the password reset confirmation endpoint for
   * administrator accounts. It carries the one-time reset token previously
   * issued (and sent to the user's email) and the new plaintext password that
   * the user wishes to set. The server will validate the token (comparing
   * against the hashed `reset_token_hash` stored in
   * `econ_political_forum_password_resets`), enforce expiry and single-use
   * semantics, update the user's `password_hash` on
   * `econ_political_forum_registereduser` on success, mark the reset record
   * `used=true` and set `used_at`, and optionally revoke active sessions in
   * `econ_political_forum_sessions`.
   *
   * Security: Do not include additional fields here (for example user
   * identifiers) because the token is the canonical mapping to the password
   * reset request. All processing and audit logging are performed
   * server-side.
   */
  export type IConfirmPasswordReset = {
    /**
     * One-time password reset token issued to the user's verified email
     * address.
     *
     * This token is the raw token delivered to the user (not the hashed
     * value stored in the database). The backend will validate the token by
     * comparing its hash to the stored `reset_token_hash` in the
     * `econ_political_forum_password_resets` record and will verify the
     * token has not expired (`expires_at`) and has not been consumed (`used
     * = false`).
     *
     * Do NOT include any sensitive secrets in this field beyond the token
     * string itself. Tokens are single-use and short-lived; the server must
     * enforce expiry and single-use semantics.
     */
    token: string;

    /**
     * New plaintext password chosen by the user. It must follow the
     * platform's password policy.
     *
     * Password policy recommendations:
     *
     * - Minimum length: 10 characters.
     * - Include at least one uppercase letter, one lowercase letter, and one
     *   digit or special character to meet basic strength requirements.
     *
     * Important: This value is transmitted to the server over TLS; the
     * server is responsible for hashing (e.g., bcrypt/argon2) before
     * persisting to `econ_political_forum_registereduser.password_hash`.
     * Never store or return the plaintext password in responses or logs.
     * Upon successful reset the server SHOULD invalidate existing sessions
     * (mark `deleted_at` for `econ_political_forum_sessions`) and rotate
     * refresh tokens for security.
     */
    new_password: string & tags.MinLength<10>;
  };

  /**
   * Response returned after attempting to confirm a password reset for an
   * administrator account.
   *
   * Behavior:
   *
   * - On success the server returns success=true, a non-sensitive message, and
   *   may optionally include `user_id` and `next_step` guidance. The server
   *   MUST NOT return any authentication tokens in this response. The server
   *   SHOULD also ensure active sessions are invalidated (or indicate to the
   *   client that they must re-authenticate) to prevent reuse of old
   *   credentials.
   * - On failure (invalid/expired token, token already used, policy violation),
   *   the server returns success=false with a user-facing message explaining
   *   the failure in clear, non-technical terms. The response must avoid
   *   leaking whether the token maps to a specific account in contexts where
   *   such disclosure would enable account enumeration.
   */
  export type IResetConfirmResponse = {
    /** Indicates whether the password reset operation succeeded. */
    success: boolean;

    /**
     * Human-readable summary of the outcome. Useful for client display and
     * localization. Messages SHOULD be non-sensitive and should not include
     * internal debug details.
     */
    message: string;

    /**
     * Optional: the unique identifier (UUID) of the account that was
     * updated. Provided for client correlation and convenience.
     *
     * This field is returned only when it is safe to do so (for example, on
     * successful reset when the server can deterministically map the token
     * to a single `econ_political_forum_registereduser.id`). Do NOT include
     * any authentication tokens or password material in this response. If
     * omitted, clients should assume the server performed the operation but
     * may require the user to log in.
     */
    user_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional guidance for the client about next steps (for example:
     * 'login_required', 'auto_login_not_permitted', or short instructions
     * about session revocation). This is an advisory field; it must not
     * contain sensitive information or tokens.
     */
    next_step?: string | undefined;
  };

  /**
   * Response returned after attempting to verify a registered user's email
   * address.
   *
   * This object communicates the outcome of the verification flow and
   * provides the canonical user identifier and the timestamp at which
   * verification occurred. It is intended for use by administrative UIs and
   * client-side flows to confirm that the registered user's `email_verified`
   * state changed.
   *
   * Notes:
   *
   * - Do not include sensitive fields such as the user's email address or
   *   password in this response. Use user_id for correlation with local
   *   records.
   * - The `verified_at` field uses ISO 8601 date-time format and should be
   *   treated as authoritative for audit logs.
   */
  export type IVerifyEmailResponse = {
    /**
     * Indicates whether the email verification operation completed
     * successfully.
     *
     * This boolean is true when the verification token was valid and the
     * user's email verification state was updated. Clients should treat
     * false as an actionable failure and surface the accompanying message
     * to the operator.
     */
    success: boolean;

    /**
     * Unique identifier of the registered user whose email was verified.
     *
     * This corresponds to the Prisma model
     * econ_political_forum_registereduser.id and is provided so clients can
     * correlate the verification result to a local record. Use this id only
     * for correlation and not to convey sensitive contact details.
     */
    user_id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the email verification was applied (ISO 8601).
     *
     * This timestamp is the canonical moment the registered user's
     * email_verified flag was set and corresponds to
     * econ_political_forum_registereduser.verified_at in the Prisma schema.
     * It is provided for auditing and UI update purposes.
     */
    verified_at: string & tags.Format<"date-time">;

    /**
     * Human-readable message describing the outcome of the verification
     * operation.
     *
     * This field is suitable for display to end users or administrators to
     * provide context (for example, "Email verified successfully" or "Token
     * expired — verification failed"). It is optional and intended for
     * presentation only.
     */
    message?: string | undefined;
  };

  /**
   * Request body for changing an authenticated administrator's password.
   *
   * This DTO is used by authenticated administrators to change their
   * password. The server must verify `current_password` matches the stored
   * password hash before updating `password_hash` in the registered user
   * record, rotate/invalidate existing sessions as appropriate, and record an
   * audit entry for the operation.
   *
   * Security guidance:
   *
   * - The `current_password` and `new_password` fields are plaintext in transit
   *   and MUST be transported only over TLS/HTTPS.
   * - The server MUST enforce password strength, store only a secure hash of
   *   `new_password`, and invalidate or rotate refresh tokens/sessions as
   *   appropriate after a successful change.
   */
  export type IChangePassword = {
    /**
     * The account's current password in plain text.
     *
     * The server uses this value only to validate the caller's identity
     * before allowing a password change. For security, the current password
     * must not be logged or returned by the API. Clients MUST send the
     * exact current password used at authentication time.
     */
    current_password: string & tags.MinLength<10>;

    /**
     * The new password to set for the account in plain text.
     *
     * This value must meet the platform's password strength policy (for
     * example, minimum length, mixture of character classes). The server is
     * responsible for hashing the password and storing the hash in
     * econ_political_forum_registereduser.password_hash. Do not send
     * confirmation of the new password in the response.
     */
    new_password: string & tags.MinLength<10> & tags.MaxLength<128>;
  };

  /**
   * Response returned after an administrator password change operation.
   *
   * This DTO communicates the result of a password change request initiated
   * by an administrator. It is intentionally simple: it signals whether the
   * operation succeeded, provides a concise human-friendly message for the
   * caller, and includes a server-side timestamp for traceability.
   *
   * Note: This type does not map directly to a Prisma model. Sensitive fields
   * such as the plaintext password or password_hash are never returned in
   * responses. Any session revocation or audit logging triggered by the
   * password change is performed server-side and is recorded separately in
   * the platform's audit logs.
   */
  export type IChangePasswordResponse = {
    /**
     * Indicates whether the password change operation completed
     * successfully.
     *
     * True when the password was updated and any required side-effects (for
     * example session invalidation) were initiated. False when the request
     * was rejected due to validation, authorization, or other
     * application-level reasons.
     */
    success: boolean;

    /**
     * Human-readable status message describing the result of the operation.
     *
     * This message is intended for display to the caller (admin UI). It
     * provides short guidance such as why an operation failed (e.g.,
     * "current password invalid", "password does not meet strength
     * requirements") or confirms success (e.g., "Password changed
     * successfully").
     */
    message: string;

    /**
     * ISO 8601 UTC timestamp when the response was generated by the server.
     *
     * This helps client and server correlate the event in logs and audit
     * trails. Example: "2025-10-03T19:21:50Z".
     */
    timestamp: string & tags.Format<"date-time">;
  };

  /**
   * Request DTO for revoking (or listing) administrator sessions.
   *
   * This type is used by administrative session-management endpoints to
   * request revocation of specific sessions (by id) or to request revocation
   * of all sessions for the authenticated administrator. When the body is
   * null, the request is a non-mutating listing operation. The actual
   * revocation is performed by updating the corresponding rows in the
   * `econ_political_forum_sessions` table (for example by setting
   * deleted_at); this DTO does not itself reference the database schema and
   * is intended only as the transport representation for the request.
   */
  export type ISessionsRevokeRequest = {
    /**
     * List of session UUIDs to revoke for the targeted user. When present,
     * the server will attempt to revoke each listed session (set deleted_at
     * or equivalent) and return a summary result. If a listed session id is
     * not found or already revoked, the server handles this idempotently
     * and reports the status per-item in the operation result (not part of
     * this request DTO).
     */
    session_ids?:
      | ((string & tags.Format<"uuid">)[] & tags.MinItems<1>)
      | undefined;

    /**
     * When true, instructs the server to revoke all active sessions for the
     * authenticated administrator. If revoke_all is true the server SHOULD
     * ignore session_ids. Use with caution: this performs a broad security
     * action and may be audited.
     */
    revoke_all?: boolean | undefined;
  } | null;

  /**
   * Session summary representing an active or revoked user session; maps to
   * econ_political_forum_sessions.
   */
  export type ISession = {
    /** Primary key of the session (econ_political_forum_sessions.id). */
    id: string & tags.Format<"uuid">;

    /**
     * UUID of the registered user owning the session
     * (econ_political_forum_sessions.registereduser_id).
     */
    registereduser_id: string & tags.Format<"uuid">;

    /** IP address observed at session creation (nullable). */
    ip_address?: string | null | undefined;

    /** User agent string captured at session creation (nullable). */
    user_agent?: string | null | undefined;

    /**
     * Timestamp of the last observed activity for the session (ISO 8601) or
     * null if not recorded.
     */
    last_active_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** Session expiry timestamp (ISO 8601). */
    expires_at: string & tags.Format<"date-time">;

    /** Session creation timestamp (ISO 8601). */
    created_at: string & tags.Format<"date-time">;

    /** Session record last update timestamp (ISO 8601). */
    updated_at: string & tags.Format<"date-time">;

    /** Soft-delete timestamp for revoked sessions (nullable). */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /** Paginated list of session summaries for administrative review. */
  export type ISessionsListResponse = {
    /** Pagination information. */
    pagination: IPageIPagination;

    /**
     * Array of session summary objects for the requested user or
     * administrative listing.
     */
    data: IEconPoliticalForumAdministrator.ISession[];
  };
}
