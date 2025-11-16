import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardModerator {
  /**
   * Request body for creating a new moderator account. Moderators are
   * administrative users who perform content moderation and user management
   * tasks.
   *
   * The registration process validates that email and username are unique
   * across all moderators (as enforced by unique constraints in the
   * discussion_board_moderators table). The password is securely hashed using
   * bcrypt with minimum 12 rounds before being stored in the password_hash
   * field. The display_name captures the moderator's identification that
   * appears in audit logs and moderation actions.
   *
   * The backend automatically initializes the moderator account with
   * account_status set to 'active', granting full moderator privileges
   * immediately upon creation. Session context information (IP address, HTTP
   * referrer, entry URL) is captured by the backend from HTTP request headers
   * and is not included in this DTO to maintain proper separation of concerns
   * between entity data and session metadata.
   *
   * The operation creates a new record in the discussion_board_moderators
   * table with timestamps created_at and updated_at set to the current time,
   * enabling the newly registered moderator to access moderation features
   * immediately.
   */
  export type ICreate = {
    /**
     * Moderator email address used for authentication and communication.
     * Must be unique across all moderator accounts in the system. Used as
     * the primary contact identifier for the moderator.
     */
    email: string & tags.Format<"email">;

    /**
     * Unique moderator username for authentication and identification. Must
     * be unique across all moderator accounts. 3-30 characters,
     * alphanumeric with underscore and hyphen. Used for login credentials
     * and displaying moderator identity in audit logs and moderation
     * actions.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">;

    /**
     * Plain text password for the moderator account. The backend securely
     * hashes this password using bcrypt with minimum 12 rounds before
     * storing in the password_hash field. Clients must transmit only plain
     * text passwords; hashing is the backend's responsibility.
     */
    password: string & tags.MinLength<8>;

    /**
     * Display name for the moderator that appears in audit logs, moderation
     * actions, and administrative interfaces. This human-readable name
     * helps identify the moderator performing moderation tasks.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<100>;
  };

  /**
   * Successful moderator authorization response containing authenticated
   * moderator information and JWT credentials.
   *
   * Returned after successful login or token refresh, providing access and
   * refresh tokens needed for authenticated API requests. Includes moderator
   * summary details (display name, account status) for client-side
   * identification and session tracking information to identify which session
   * the tokens correspond to.
   *
   * The token field contains access_token for API authentication and
   * refresh_token for future token renewal without requiring password
   * re-entry.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated moderator. Used to identify
     * the moderator in the system and correlate with moderator account
     * records.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Summary information about the authenticated moderator including
     * display name and current account status.
     */
    moderator: IDiscussionBoardModerator.ISummary;
  };

  /**
   * Moderator login credentials and session context for authentication.
   * Enables existing moderators to authenticate using either email or
   * username with password credentials. The login operation creates a new
   * session in discussion_board_moderator_sessions table capturing IP, href,
   * and referrer context for security monitoring. The plain text password is
   * validated against the stored password_hash in the
   * discussion_board_moderators table. Successful authentication returns
   * IDiscussionBoardModerator.IAuthorized with JWT tokens.
   */
  export type ILogin = {
    /**
     * Moderator's email address for login authentication. Must be a valid
     * email format matching unique email constraint in
     * discussion_board_moderators table. Case-insensitive. Either email or
     * username must be provided for authentication.
     */
    email?: (string & tags.Format<"email">) | undefined;

    /**
     * Moderator's username for login authentication. Case-insensitive
     * unique constraint, 3-30 characters alphanumeric with
     * underscore/hyphen. Either email or username must be provided for
     * authentication.
     */
    username?:
      | (string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">)
      | undefined;

    /**
     * Plain text password for moderator authentication. Validated against
     * stored password_hash in discussion_board_moderators table using
     * bcrypt verification. Never stored in plain text, hashed immediately
     * by backend.
     */
    password: string;

    /**
     * Client IP address (IPv4 or IPv6) from which moderator login
     * originates. Optional - server can extract from request headers for
     * standard HTTP requests, but clients may provide for server-side
     * rendering or proxy scenarios. Used for session security tracking and
     * audit logging.
     */
    ip?: string | null | undefined;

    /**
     * Full URL/URI where moderator login occurred. Captures the entry point
     * for moderation dashboard access. Mandatory for audit trail and
     * understanding moderator access patterns. Current page URL from
     * client.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referrer header value when moderator login occurred. Indicates
     * source of authentication request. Mandatory for security context. May
     * be empty string if no referrer available.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Request body for refreshing moderator authentication tokens. Contains the
   * refresh token from a previous login or token refresh operation, used to
   * validate the session and issue new access/refresh token pair without
   * requiring password re-entry.
   */
  export type IRefresh = {
    /**
     * Valid refresh token previously issued during moderator login or token
     * refresh. Used to validate the session and obtain new access and
     * refresh tokens. Must correspond to an active session in
     * discussion_board_moderator_sessions table.
     */
    refresh_token: string;
  };

  /**
   * Lightweight summary representation of a moderator for reference in
   * moderation actions and audit trails.
   *
   * Includes only essential identification and status information needed when
   * displaying moderator involvement in moderation decisions. Used when
   * showing who performed a moderation action without exposing sensitive
   * administrative details like email or password hash.
   *
   * The summary provides sufficient context for audit logs and user-facing
   * moderation history while maintaining security by excluding authentication
   * credentials.
   */
  export type ISummary = {
    /**
     * Unique identifier for the moderator. Immutable UUID generated when
     * moderator account is created.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Moderator's display name for identification in audit logs and
     * moderation history. Shows publicly in moderation actions (e.g.,
     * 'Comment removed by [display_name]'). 1-50 characters.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<50>;

    /**
     * Current moderator account status controlling access and privileges.
     *
     * Values represent:
     *
     * - Active: Moderator has full privileges and can perform all moderation
     *   actions
     * - Inactive: Temporarily suspended from moderating, no moderation access
     *   allowed
     * - Terminated: Permanently revoked moderator status, account access
     *   removed
     *
     * Default status is 'active' when moderator is first created.
     */
    account_status: "active" | "inactive" | "terminated";
  };

  /**
   * Request body for validating a moderator's authentication token and active
   * session.
   *
   * This DTO is used when a moderator wants to verify that their current
   * access token is still valid and their associated session remains active.
   * The token is validated against the moderator's session records to ensure
   * the session has not been terminated or expired beyond the 7-day window.
   *
   * The moderator typically sends this token as part of their regular API
   * requests to determine if session refresh is needed or to maintain session
   * continuity across protected resources.
   */
  export type IValidateToken = {
    /**
     * The moderator's access token in JWT format for validation. This is
     * the Bearer token provided in the Authorization header without the
     * 'Bearer ' prefix. Used to verify the moderator's authentication
     * status and active session.
     */
    token: string;
  };

  /**
   * Response body containing the result of a moderator token validation check
   * and associated session details.
   *
   * Returned when a moderator validates their authentication token to verify
   * it is still valid and their session remains active. The response includes
   * comprehensive token and session information that allows the client to
   * determine whether the moderator needs to refresh their session or
   * re-authenticate.
   *
   * Validation Process: The system performs the following checks: (1) JWT
   * signature verification using the configured signing secret, (2) token
   * expiration check by comparing the exp claim against current time, (3)
   * session existence verification in discussion_board_moderator_sessions
   * table, (4) session status verification (expired_at must be null), and (5)
   * moderator account status verification in discussion_board_moderators
   * table (must be 'active').
   *
   * Response Behavior Based on Validation Result:
   *
   * - When is_valid is true: All fields contain complete and current
   *   information. The moderator's session is active and valid within the
   *   7-day window. All moderator details, session information, and token
   *   timestamps are fully populated and reliable.
   * - When is_valid is false: Some fields are null as extraction failed. The
   *   moderator_id, username, display_name, email, email_verified,
   *   session_id, session_created_at, token_issued_at, and token_expires_at
   *   fields are null because validation failed before full data could be
   *   retrieved. Only the role field is always populated as 'moderator'. This
   *   allows clients to distinguish between validation success and failure
   *   states.
   */
  export type ITokenValidation = {
    /**
     * Indicates whether the moderator's access token and associated session
     * are currently active and valid. Returns true if the token signature
     * is valid, not expired, and the corresponding session exists and has
     * not been terminated. Returns false if any validation check fails.
     *
     * When is_valid is true, all other fields in the response contain
     * complete and current moderator and session information. When is_valid
     * is false, the remaining fields may be null or contain incomplete
     * information, as validation failed before full session data could be
     * retrieved.
     */
    is_valid: boolean;

    /**
     * Unique identifier of the moderator whose token was validated. This is
     * extracted from the JWT claims (userId field) when the token signature
     * and claims are valid. If validation fails (is_valid is false), this
     * field is null because the moderator identity cannot be confirmed from
     * an invalid token.
     */
    moderator_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Username of the authenticated moderator. Extracted from the JWT token
     * claims (username field) and identifies the moderator by their login
     * username. Only populated when the token validation succeeds (is_valid
     * is true). Returns null if validation fails.
     */
    username?: string | null | undefined;

    /**
     * Display name of the moderator. Extracted from the JWT token claims
     * (displayName field) when validation succeeds. This is the name
     * displayed in the moderation interface and audit logs. Returns null if
     * validation fails (is_valid is false).
     */
    display_name?: string | null | undefined;

    /**
     * Email address of the authenticated moderator. Extracted from the JWT
     * token claims when validation succeeds. Used for communication and as
     * part of the moderator's identity in the system. Returns null if
     * validation fails (is_valid is false).
     */
    email?: (string & tags.Format<"email">) | null | undefined;

    /**
     * Authorization role of the authenticated user. Always 'moderator' for
     * this validation endpoint. Indicates that this token belongs to a
     * moderator with elevated permissions for content moderation and user
     * management.
     */
    role: "moderator";

    /**
     * Indicates whether the moderator's email address has been verified.
     * Extracted from the JWT token claims (emailVerified field) when
     * validation succeeds. Shows the email verification status at the time
     * the token was issued. Returns null if validation fails (is_valid is
     * false).
     */
    email_verified?: boolean | null | undefined;

    /**
     * Current account status of the moderator in the
     * discussion_board_moderators table. Shows whether the moderator
     * account is active, suspended, or permanently terminated. Only
     * 'active' status allows validation to succeed. If the status is not
     * 'active', the validation fails even if the token appears valid.
     * Returns null if validation fails (is_valid is false).
     */
    account_status?: "active" | "suspended" | "terminated" | null | undefined;

    /**
     * Unique identifier of the active moderator session associated with the
     * token. This session must exist in the
     * discussion_board_moderator_sessions table with a null expired_at
     * value (indicating an active, non-terminated session). Returns null if
     * no active session exists or if validation fails (is_valid is false).
     */
    session_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Timestamp when the validated session was created. Stored in
     * discussion_board_moderator_sessions.created_at. Used to verify the
     * session is within the 7-day expiration window. Returns null if
     * validation fails or session cannot be retrieved (is_valid is false).
     */
    session_created_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when the access token was issued (iat claim in JWT).
     * Indicates when the moderator authenticated and obtained this token.
     * Returns null if token validation fails (is_valid is false).
     */
    token_issued_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when the access token will expire (exp claim in JWT). After
     * this time, the token becomes invalid and the moderator must refresh
     * or re-authenticate. Returns null if token validation fails (is_valid
     * is false).
     */
    token_expires_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
