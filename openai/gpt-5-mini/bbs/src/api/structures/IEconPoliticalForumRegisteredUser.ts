import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { IPage } from "./IPage";

export namespace IEconPoliticalForumRegisteredUser {
  /**
   * Registration (join) request for a new registered user.
   *
   * This DTO includes only the client-provided fields necessary to create a
   * new account. System-managed fields such as id, created_at, updated_at,
   * email_verified, verified_at, failed_login_attempts, locked_until, and
   * password_hash are set or managed by the server and MUST NOT be provided
   * by the client.
   */
  export type IJoin = {
    /**
     * Unique account username used for login and display.
     *
     * Recommended constraints: 3–30 characters, normalized (lowercase where
     * appropriate), no leading/trailing whitespace. The server enforces
     * uniqueness against econ_political_forum_registereduser.username and
     * will return a 409 Conflict if the username is already taken.
     */
    username: string;

    /**
     * Verified email address for account recovery and notifications.
     *
     * Clients MUST provide a valid business email address. The server
     * enforces uniqueness against econ_political_forum_registereduser.email
     * and will send a verification email; the created account will have
     * email_verified=false until verification completes.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password supplied by the client. The server MUST never
     * store this value in plaintext; it will compute and persist a secure
     * password hash in econ_political_forum_registereduser.password_hash.
     *
     * Password guidelines (server-side validation recommended): minimum 10
     * characters and a mix of character classes to meet strength
     * requirements. Do not include password_hash or other derived fields in
     * this DTO.
     */
    password: string;

    /**
     * Optional human-friendly display name shown publicly. May differ from
     * username.
     *
     * Suggested limits: 3–30 characters. This field is optional and, if
     * omitted, the system may default to the username for public displays.
     */
    display_name?: string | undefined;
  };

  /**
   * Authorization response for a registered user.
   *
   * This DTO is returned after successful authentication (login, join, or
   * refresh) and contains the authenticated user's identifier plus the
   * authorization token payload. Sensitive fields such as password_hash,
   * failed_login_attempts, locked_until, and other internal security fields
   * are intentionally excluded from this response to protect user security
   * and privacy.
   *
   * Include only public-facing profile data in this DTO and avoid exposing
   * internal or secret information. The presence of `x-autobe-prisma-schema`
   * indicates a direct mapping to the Prisma model
   * `econ_political_forum_registereduser`; every property included here
   * corresponds to an existing column in that model.
   */
  export type IAuthorized = {
    /**
     * Primary identifier of the registered user. This maps directly to the
     * Prisma model field `econ_political_forum_registereduser.id` and is
     * used to reference the authenticated user in moderation and audit
     * logs.
     *
     * This value is a UUID and is the canonical key for user records in the
     * database. It must be stable and globally unique.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Normalized username of the account (Prisma:
     * `econ_political_forum_registereduser.username`).
     *
     * This field is suitable for display and routing. It is normalized and
     * unique at the database level.
     */
    username?: string | null | undefined;

    /**
     * Optional public display name (Prisma:
     * `econ_political_forum_registereduser.display_name`).
     *
     * This value is intended for UI presentation and may differ from the
     * login username. It may be null when the user has not set a display
     * name.
     */
    display_name?: string | null | undefined;

    /**
     * Optional URI to the user's avatar image (Prisma:
     * `econ_political_forum_registereduser.avatar_uri`).
     *
     * If present, the URI may be proxied by the CDN. Clients SHOULD treat
     * this value as a presentation hint and not as a secret or direct
     * storage path.
     */
    avatar_uri?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Flag indicating whether the user's email address has been verified
     * (Prisma: `econ_political_forum_registereduser.email_verified`).
     *
     * This boolean is useful for client flows that gate posting to
     * restricted categories that require verified accounts.
     */
    email_verified?: boolean | undefined;

    /**
     * Record creation timestamp for the user (Prisma:
     * `econ_political_forum_registereduser.created_at`).
     *
     * Timestamps are provided in ISO 8601 / UTC (date-time) format and are
     * intended for display and sorting in client UIs.
     */
    created_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Last profile update timestamp (Prisma:
     * `econ_political_forum_registereduser.updated_at`).
     *
     * This timestamp is updated by server-side profile changes and may be
     * used to display "last active" or profile-modified information.
     */
    updated_at?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Login request payload for registered users.
   *
   * This DTO carries the credentials needed to authenticate a registered
   * user. The server MUST validate inputs, apply rate-limiting and lockout
   * policies, and must not return sensitive error details that could be used
   * for account enumeration. Use this payload with the POST
   * /auth/registeredUser/login endpoint.
   */
  export type ILogin = {
    /**
     * Username or email address supplied by the user for authentication.
     *
     * Accept either the user's normalized username or their verified email
     * address. The server will attempt to resolve the identifier to a
     * registered account and validate the supplied password.
     */
    usernameOrEmail: string;

    /**
     * Plaintext password submitted for authentication.
     *
     * Passwords are transmitted to the server only over TLS. The server is
     * responsible for comparing the supplied plaintext password against the
     * stored `password_hash` (Prisma:
     * `econ_political_forum_registereduser.password_hash`). Do NOT include
     * password hashes in requests or responses.
     */
    password: string;
  };

  /**
   * Request body for rotating a registered user's refresh token and issuing a
   * new access token.
   *
   * This DTO is used by the endpoint that accepts a refresh token and returns
   * a new access token plus a rotated refresh token. The implementation must
   * validate token expiry and revocation state, verify the underlying session
   * is active (e.g., corresponding session record in
   * econ_political_forum_sessions not revoked), and record rotation/audit
   * events as required by security policy.
   *
   * Note: This request DTO is intentionally minimal and contains only the
   * refresh token string. Do not include user-identifying fields in the
   * request body; the server derives user/session identity from the validated
   * refresh token.
   */
  export type IRefresh = {
    /**
     * Refresh token previously issued to the client. This token MUST be
     * presented to obtain a new short-lived access token and a rotated
     * refresh token. The token value is opaque to the server consumer; the
     * implementation verifies it against the token store or stateless JWT
     * revocation strategy.
     *
     * Business rules: Tokens should be rotated on each successful use.
     * Presenting a revoked or expired token MUST be rejected with 401
     * Unauthorized. The API expects the token as a single string value.
     */
    refresh_token: string;
  };

  /**
   * Request body used to initiate a password-reset flow for a registered
   * user.
   *
   * Upon receiving this request the service will (when a matching account
   * exists) create a single-use password reset record
   * (econ_political_forum_password_resets) with a hashed token and expiry,
   * send a one-time reset link to the provided email, and record an audit
   * event. For security, responses to callers must be generic and not
   * disclose account existence. Implementations MUST store only a hash of the
   * reset token and enforce a limited lifetime for reset tokens.
   */
  export type IRequestPasswordReset = {
    /**
     * Email address of the account for which a password reset is requested.
     * The server will NOT reveal whether this email exists in the system in
     * the public response to avoid account enumeration. The backend uses
     * this email to locate the registered user
     * (econ_political_forum_registereduser.email) and to create a password
     * reset record (econ_political_forum_password_resets.reset_token_hash)
     * when appropriate.
     *
     * Business guidance: Validate the value as an RFC-5322-compatible email
     * address. Rate-limit requests to this endpoint to prevent abuse. The
     * server SHOULD always return a generic acknowledgement regardless of
     * whether an account with this email exists.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Generic success response used by account-related endpoints such as
   * password reset confirmation or email verification.
   *
   * This DTO provides a minimal, safe acknowledgement of operation outcome.
   * It contains a required boolean `success` flag and optional fields for a
   * human-readable `message` and a machine-friendly `code` to support
   * client-side workflows and telemetry.
   *
   * Do not include sensitive information in `message` or `code`. Use `code`
   * for programmatic handling and `message` for display only.
   */
  export type IGenericSuccess = {
    /**
     * Indicates whether the requested operation completed successfully.
     * Clients should treat `true` as success and `false` as a general
     * failure indicator; additional details may be provided in the
     * `message` field.
     */
    success: boolean;

    /**
     * A human-readable informational message describing the result. This
     * text is intended for display in user interfaces and can be used to
     * convey next steps or confirmation details.
     */
    message?: string | undefined;

    /**
     * Optional machine-readable status code identifying the result or
     * subtype of success. Consumers can use this code for conditional flows
     * or telemetry (for example: "PASSWORD_CHANGED", "EMAIL_VERIFIED").
     */
    code?: string | undefined;
  };

  /**
   * Request body used to confirm a password reset flow.
   *
   * This DTO contains the one-time `token` issued during the reset request
   * and the `new_password` the user wishes to set. The server validates the
   * token (single-use, expiry) and updates the account password on success,
   * invalidating active sessions per security policy.
   *
   * Password policy: minimum length 10 and a mix of upper/lower case and
   * either digits or special characters. The client should present clear
   * error messages when the new password does not meet these requirements.
   */
  export type IConfirmPasswordReset = {
    /**
     * Single-use password reset token previously issued to the user's
     * verified email. Clients must submit the token exactly as received;
     * the server will validate token existence, expiry, and single-use
     * semantics.
     */
    token: string;

    /**
     * The new password for the account. Passwords MUST be at least 10
     * characters long and include at least one uppercase letter, one
     * lowercase letter, and at least one digit or special character. The
     * server will enforce additional password policy and will store only a
     * securely hashed value; plaintext passwords are accepted on input
     * only.
     */
    new_password: string &
      tags.MinLength<10> &
      tags.Pattern<"^(?=.{10,})(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9\\W]).*$">;
  };

  /**
   * Request body for email verification.
   *
   * This object contains the single required property used by the server to
   * validate and complete an email verification flow for a registered user.
   * On successful verification the server updates the corresponding
   * econ_political_forum_registereduser.email_verified and
   * econ_political_forum_registereduser.verified_at fields.
   *
   * Do NOT include any sensitive data such as passwords. The token is
   * single-use and must be validated and consumed by the server.
   */
  export type IVerifyEmail = {
    /**
     * Single-use email verification token issued by the platform.
     *
     * This token is presented to the verify-email endpoint to confirm
     * ownership of the email address associated with a registered user
     * account. The token MUST be treated as confidential by clients and is
     * expected to be time-limited by the server-side issuance process. The
     * server validates the token and, on success, sets the registered
     * user's email_verified flag and verified_at timestamp in the
     * econ_political_forum_registereduser record.
     */
    token: string & tags.MinLength<1>;
  };

  /**
   * Request body to request resending of an email verification link.
   *
   * Clients supply the user's email address. The server will generate and
   * send a new verification token to that address (if an account exists) and
   * return a generic acknowledgement to avoid account enumeration. This DTO
   * intentionally contains only the minimally required field for initiating
   * the resend flow.
   */
  export type IResendVerification = {
    /**
     * Verified email address for which a new verification email should be
     * sent.
     *
     * This value maps to the econ_political_forum_registereduser.email
     * column. For security and privacy, the API MUST respond with a generic
     * acknowledgement (not revealing whether the email exists) and SHOULD
     * apply rate-limiting to prevent abuse. The server implements the
     * actual resend behavior (generation of a new single-use verification
     * token and email delivery).
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Request body for changing an authenticated registered user's password.
   * Caller is authenticated; server validates currentPassword and updates
   * stored password_hash with hashed newPassword. This DTO deliberately does
   * NOT include an x-autobe-prisma-schema mapping because it is a
   * request-only payload and does not directly map to Prisma columns.
   */
  export type IChangePassword = {
    /**
     * Current account password in plain text. The server MUST verify this
     * against the stored password_hash for the authenticated registered
     * user. This value MUST NOT be logged or stored in plaintext.
     */
    currentPassword: string;

    /**
     * New desired password in plain text. The server will validate password
     * strength and persist only a hashed representation in
     * econ_political_forum_registereduser.password_hash. After successful
     * change the server SHOULD rotate or revoke existing sessions.
     */
    newPassword: string;
  };

  /**
   * Session summary for a registered user.
   *
   * This object is a safe, non-sensitive representation of a session stored
   * in the Prisma model `econ_political_forum_sessions`. It intentionally
   * excludes any sensitive fields such as session_token or
   * refresh_token_hash. All properties listed correspond to actual columns on
   * the referenced Prisma model.
   *
   * Use: returned by session listing endpoints (for example, GET
   * /auth/registeredUser/sessions).
   */
  export type ISession = {
    /**
     * Primary identifier of the session record stored in the
     * econ_political_forum_sessions table. This is a stable UUID used to
     * reference the session for revocation and listing.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the session was created in the database. This value is
     * produced by the database and is returned for audit and display in
     * session lists.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent activity observed for this session.
     * Nullable when no activity has been recorded after creation.
     */
    last_active_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Session expiry timestamp. Clients should use this to anticipate token
     * refreshes. This field exists on the referenced Prisma model and is
     * safe to expose as part of a session summary (do NOT expose token
     * values).
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * IP address captured at session creation (nullable). Exposed here for
     * the session owner's security review. This is not a secret but is
     * considered privacy-sensitive; it is returned only in owner/admin
     * contexts.
     */
    ip_address?: string | null | undefined;

    /**
     * User agent string captured at session creation. Nullable. Returned to
     * help the session owner identify devices. Do NOT include any tokens or
     * secret fields in this schema.
     */
    user_agent?: string | null | undefined;
  };

  /**
   * Paginated list of session summary records for a registered user. Uses the
   * canonical IPage.IPagination reference for pagination. Data items
   * reference IEconPoliticalForumRegisteredUser.ISession.
   */
  export type ISessionList = {
    /** Pagination information for the session list. */
    pagination: IPage.IPagination;

    /** Array of session summary records for the authenticated user. */
    data: IEconPoliticalForumRegisteredUser.ISession[];
  };

  /**
   * Public summary view of a registered user.
   *
   * This DTO provides a safe, sanitized view of a user's public profile
   * suitable for lists and thread author attributions. It intentionally
   * excludes sensitive fields from the underlying Prisma model (for example:
   * email, password_hash, failed_login_attempts, locked_until, deleted_at).
   *
   * The shape is derived directly from the
   * `econ_political_forum_registereduser` Prisma model and includes only
   * fields that are safe for public consumption. Use this type when returning
   * user data to other users and public pages; for owner/admin contexts use
   * expanded types that include additional metadata.
   */
  export type ISummary = {
    /**
     * Primary identifier of the registered user as stored in the database.
     *
     * This property maps to econ_political_forum_registereduser.id in the
     * Prisma schema and is the canonical UUID used across threads, posts,
     * and audit logs to reference the user.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique account username used for login and public display.
     *
     * This property corresponds to
     * econ_political_forum_registereduser.username in the Prisma schema and
     * is normalized and unique across the system. It is intended for public
     * display and routing; do not expose sensitive data such as email or
     * password here.
     */
    username: string;

    /**
     * Optional human-friendly display name shown in the UI.
     *
     * This maps to econ_political_forum_registereduser.display_name in the
     * Prisma schema. It is nullable in the database; when present it
     * provides a friendlier label than the username.
     */
    display_name?: string | undefined;

    /**
     * Optional short biography or profile description authored by the user.
     *
     * This property maps to econ_political_forum_registereduser.bio in the
     * Prisma schema and is intended for brief public profile text. Long or
     * sensitive content should be avoided in public summaries.
     */
    bio?: string | undefined;

    /**
     * Optional URI to the user's avatar image (may be proxied via CDN).
     *
     * This property maps to econ_political_forum_registereduser.avatar_uri
     * in the Prisma schema. The URI should be treated as a public resource
     * locator; image hosting and access control are handled by the
     * application layer.
     */
    avatar_uri?: (string & tags.Format<"uri">) | undefined;

    /**
     * Account creation timestamp in ISO 8601 format.
     *
     * Maps to econ_political_forum_registereduser.created_at in the Prisma
     * schema. Included to help UI sort/filter and surface account vintage
     * without exposing sensitive operation metadata.
     */
    created_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Timestamp of the last profile update in ISO 8601 format.
     *
     * This corresponds to econ_political_forum_registereduser.updated_at in
     * the Prisma schema and indicates when public profile fields were last
     * changed.
     */
    updated_at?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Request DTO for searching and listing registered users. This object
   * contains safe, filterable fields used by administrative user listing
   * endpoints.
   *
   * Typical usage: provide partial username or displayName for fuzzy search,
   * optionally filter by email verification or ban status, constrain by
   * createdFrom/createdTo date range, and paginate results using page/limit
   * or an opaque cursor. Sorting is supported via sortBy and sortOrder. The
   * includeDeleted flag is admin-restricted and, if set, will return archived
   * accounts as well as active ones.
   */
  export type IRequest = {
    /**
     * Optional partial match string for the account username
     * (case-insensitive, trimmed). Use this field to search users by
     * username prefix or substring. The server uses trigram/partial
     * matching for performant searches.
     */
    username?: string | undefined;

    /**
     * Optional partial match string for the user's public display name.
     * Used to find users by display_name (case-insensitive).
     */
    displayName?: string | undefined;

    /**
     * Optional filter to include only email-verified accounts when true, or
     * only unverified accounts when false. Use with care: queries that
     * include exact email matching are considered PII-sensitive and may be
     * audited by the server.
     */
    emailVerified?: boolean | undefined;

    /**
     * Optional filter to include only banned (true) or non-banned (false)
     * accounts.
     */
    isBanned?: boolean | undefined;

    /**
     * Optional ISO 8601 date-time (UTC) lower bound for account creation
     * timestamp. Use to filter accounts created on or after this
     * timestamp.
     */
    createdFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional ISO 8601 date-time (UTC) upper bound for account creation
     * timestamp. Use to filter accounts created on or before this
     * timestamp.
     */
    createdTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for page-based pagination (1-based). If omitted, server
     * may default to page 1.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum number of records to return per page. The server enforces a
     * maximum cap; clients should respect sensible defaults to avoid large
     * responses.
     */
    limit?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional opaque cursor for cursor-based pagination. When provided the
     * server will ignore page/limit and use cursor continuation semantics.
     */
    cursor?: string | undefined;

    /**
     * Field to sort results by. Allowed values: 'created_at' (creation
     * time) or 'username'.
     */
    sortBy?: "created_at" | "username" | undefined;

    /** Sort direction. Allowed values: 'asc' or 'desc'. */
    sortOrder?: "asc" | "desc" | undefined;

    /**
     * Optional flag indicating whether to include soft-deleted (archived)
     * accounts in the result set. This flag is restricted to administrator
     * callers and will be ignored or rejected for non-admin requests.
     */
    includeDeleted?: boolean | undefined;
  };
}
