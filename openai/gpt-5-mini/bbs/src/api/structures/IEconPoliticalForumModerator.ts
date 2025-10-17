import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconPoliticalForumModerator {
  /**
   * Create DTO for moderator-capable registered users. Clients supply plain
   * `password`; the server is responsible for hashing and storing only
   * `password_hash`. This DTO intentionally does not include an
   * x-autobe-prisma-schema annotation because it accepts client-only fields
   * (plain password) that do not directly exist as stored columns in the
   * Prisma model.
   */
  export type ICreate = {
    /**
     * Unique account username for the moderator-capable account. Maps to
     * econ_political_forum_registereduser.username in the Prisma schema.
     * Server-side normalization is recommended.
     */
    username: string;

    /**
     * Contact email for the account. Maps to
     * econ_political_forum_registereduser.email. Used for verification and
     * password recovery.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password supplied by the client. The server MUST hash this
     * value and persist only the hash to
     * econ_political_forum_registereduser.password_hash. Do not return this
     * value in any response DTO.
     */
    password: string;

    /**
     * Optional public display name. Maps to
     * econ_political_forum_registereduser.display_name when provided.
     */
    display_name?: string | null | undefined;
  };

  /**
   * Moderator authorization response returned after successful authentication
   * or token refresh.
   *
   * This object contains the authenticated moderator's stable identifier and
   * the authorization token payload used for subsequent API access. The `id`
   * is the database primary key for the registered user and is included to
   * enable client correlation and auditability. The `token` property
   * references the shared IAuthorizationToken component (access and refresh
   * token details) rather than embedding token internals in this schema.
   *
   * Security note: The response MUST NOT include sensitive account fields
   * such as password_hash; when mapping to the Prisma model via
   * x-autobe-prisma-schema, only properties that exist on the model are
   * allowed and no sensitive fields are exposed here.
   *
   * @title IEconPoliticalForumModerator.IAuthorized
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated registered user (moderator).
     * This value maps to econ_political_forum_registereduser.id in the
     * database.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Moderator login request.
   *
   * This request body is used to authenticate a moderator-capable registered
   * account. It contains the credential fields required to verify identity.
   * The server locates a registered user by `username` or `email`, validates
   * the provided `password` against the stored `password_hash`, and returns
   * an authorization response (IAuthorized) on success.
   *
   * Security note: Do not include any sensitive persisted fields in this DTO.
   * Error responses MUST not reveal whether the username/email exists.
   *
   * @title IEconPoliticalForumModerator.ILogin
   */
  export type ILogin = {
    /**
     * Username or email address supplied by the moderator attempting to
     * authenticate.
     *
     * This field accepts either the account username or the verified email
     * address used during registration. The server will normalize the value
     * and use it to locate the registered account for credential
     * verification.
     */
    usernameOrEmail: string;

    /**
     * Plain-text password provided by the moderator for authentication.
     *
     * The backend MUST never store this value; it will be compared against
     * the stored password_hash for the matched registered user. Use secure
     * transfer (HTTPS) and strong server-side hashing. Clients send plain
     * text only for verification purposes.
     */
    password: string;
  };

  /**
   * Moderator token refresh request.
   *
   * Clients call this endpoint to exchange a valid refresh token for a new
   * access token and a rotated refresh token. The request MUST include the
   * issued refresh token; optionally, clients may include a session
   * identifier to assist server-side validation. The server MUST validate the
   * token, ensure the associated session is active (not revoked or
   * soft-deleted), rotate the refresh token, and return an IAuthorized
   * response.
   *
   * Security note: Implement strict validation, rotation, and logging for
   * refresh flows. Reuse of an already-rotated refresh token MUST be treated
   * as suspicious.
   *
   * @title IEconPoliticalForumModerator.IRefresh
   */
  export type IRefresh = {
    /**
     * Refresh token previously issued to the moderator session.
     *
     * The token is a long-lived, rotating credential used to obtain a new
     * short-lived access token. The server MUST validate the token (or its
     * hash) against the session store and rotate it on success.
     * Implementations should reject reused or revoked tokens.
     */
    refresh_token: string;

    /**
     * Optional session identifier (UUID) associated with the refresh token.
     *
     * When provided, the server may use the session_id to look up a session
     * row (econ_political_forum_sessions) for additional validation such as
     * checking deleted_at or expires_at. Inclusion of this field is
     * optional; servers may derive the session from the refresh token
     * itself.
     */
    session_id?: (string & tags.Format<"uuid">) | null | undefined;
  };

  /**
   * Password reset request payload for moderator-capable accounts.
   *
   * This object represents the minimal information required to initiate a
   * password recovery flow. When a valid request is received, the backend
   * creates a single-use reset entry
   * (econ_political_forum_password_resets.reset_token_hash, expires_at) and
   * triggers email delivery. The request is intentionally minimal (email
   * only) to reduce exposure of PII and to simplify anti-abuse controls such
   * as rate-limiting and CAPTCHA.
   *
   * Business notes:
   *
   * - The server MUST store only a hash of any generated reset token
   *   (reset_token_hash) and must enforce expiry and single-use semantics.
   * - The client MUST not infer existence of an account from the response; the
   *   server SHALL provide a generic acknowledgement message to the user.
   */
  export type IPasswordResetRequest = {
    /**
     * The email address associated with the account for which a password
     * reset is requested. The service will use this value to locate the
     * registered user (econ_political_forum_registereduser.email) and, if
     * an account exists, create a corresponding password reset record
     * (econ_political_forum_password_resets) and send a one‑time reset
     * link.
     *
     * This property MUST contain a valid email address string in standard
     * email format. For security and privacy, the API implementation MUST
     * respond with a generic acknowledgement regardless of whether the
     * email exists in the system to avoid account enumeration.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Acknowledgement response for a password reset request.
   *
   * This DTO provides a safe, non-revealing acknowledgement to the client
   * after a password reset request is submitted. It is intentionally generic
   * to protect user privacy and to avoid leaking account existence. The
   * server may return additional HTTP headers (for example Retry-After) when
   * rate-limited; such headers are out of scope of this schema.
   *
   * Behavioral notes:
   *
   * - This response does not indicate that a reset email was actually
   *   delivered, only that the request was accepted for processing.
   * - When the server rejects a request (for example due to malformed input or
   *   abuse prevention), return success=false with an appropriate message and
   *   the corresponding HTTP status code (e.g., 400 or 429).
   */
  export type IPasswordResetRequestAck = {
    /**
     * Indicates whether the request was accepted for processing. A value of
     * true means the request was accepted and the system will attempt to
     * send a password reset link when applicable. A value of false
     * indicates the request was not processed due to a server-side
     * validation or rate-limit condition.
     */
    success: boolean;

    /**
     * Human-readable, localized message suitable for display to the
     * requester. Messages SHOULD be generic to avoid account enumeration
     * (for example: 'If an account exists for the provided email address, a
     * password reset link will be sent.'). The server may include advice
     * about rate limits or next steps but must not reveal whether the email
     * is present in the system.
     */
    message: string;
  };

  /**
   * Password reset confirmation request.
   *
   * This object is submitted when a user consumes a one-time password reset
   * token to set a new account password. The `token` property carries the
   * single-use token issued by the password reset flow; the `new_password`
   * property contains the user's chosen plaintext password. The backend MUST
   * validate token expiry and single-use semantics, update the user's stored
   * password hash, mark the reset record as used, and rotate or invalidate
   * active sessions as appropriate.
   *
   * Security note: Do NOT include password hashes or other secrets in the
   * request. Transport MUST use TLS. The server is responsible for enforcing
   * password strength and for audit logging the password-change event.
   */
  export type IPasswordResetConfirm = {
    /**
     * One-time password reset token delivered to the user's verified email
     * address. This token is single-use and time-limited; the server will
     * validate it against the password reset record. Clients MUST supply
     * the exact token string they received. Example format: a URL-safe
     * opaque string.
     */
    token: string & tags.MinLength<8>;

    /**
     * New plaintext password chosen by the user. The server will hash this
     * value before persisting it to the database. Password policy: minimum
     * 10 characters; recommend at least one uppercase letter, one lowercase
     * letter, and one digit or symbol. Clients SHOULD not send any other
     * sensitive fields in this request.
     */
    new_password: string & tags.MinLength<10> & tags.MaxLength<128>;
  };

  /**
   * Acknowledgement returned after attempting to confirm a password reset.
   *
   * This response communicates the outcome of the password reset confirm
   * operation. It contains a boolean `success` and a user-facing `message`.
   * On success the server may optionally prompt the client to navigate to the
   * sign-in flow; on failure the message should avoid exposing sensitive
   * internal state but should be actionable (for example, suggest requesting
   * a new reset token). The server MUST NOT include tokens, password hashes,
   * or other sensitive information in this response.
   */
  export type IPasswordResetConfirmAck = {
    /**
     * Indicates whether the password reset operation completed
     * successfully.
     */
    success: boolean;

    /**
     * Human-readable message describing the result. For successful
     * responses, this may include next steps (for example, 'Password
     * updated; please log in with your new password'). For failures,
     * provide a brief reason suitable for end users without leaking
     * sensitive details (for example, 'Invalid or expired token').
     */
    message: string & tags.MinLength<1>;
  };
}
