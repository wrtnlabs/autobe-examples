import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppUser {
  /**
   * User registration request body for creating a new user account.
   *
   * Captures essential user information and session context required to
   * establish a new authenticated user account in the Todo application. The
   * registration operation is the primary entry point for new users to create
   * accounts with immediate session establishment.
   *
   * Password is accepted in plain text format and securely hashed by the
   * backend before storage. Session context fields (href, referrer, and
   * optional ip) are captured to populate the user's initial session record
   * with proper audit trail and referrer information.
   *
   * Email must be unique and validates that no existing account uses the
   * provided email address.
   */
  export type ICreate = {
    /**
     * User's email address for account registration. Must be a valid email
     * format and unique across all users. Used as the primary
     * authentication credential.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for account creation. Minimum 8 characters
     * required. The backend will securely hash this password before storing
     * in the database.
     */
    password: string & tags.MinLength<8>;

    /**
     * Client IP address for session tracking and security purposes.
     * Optional - server can extract from request headers if not provided.
     * Useful for Server-Side Rendering scenarios where client cannot
     * determine their own IP.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) where the user initiated
     * registration. Mandatory field for session context tracking and
     * referrer analytics.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) indicating where the user came from
     * before registration. Mandatory field for tracking user journey and
     * session origin context.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Authenticated user account with JWT tokens for session management.
   *
   * This DTO represents a successfully authenticated user and includes the
   * user's unique identifier and JWT token information for making
   * authenticated API requests.
   *
   * The ID field contains the UUID that uniquely identifies the authenticated
   * user account. The token object contains both access and refresh tokens
   * needed to authenticate subsequent requests and extend the session
   * lifetime.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user account. This UUID is
     * used in authenticated API requests to identify the user making the
     * request.
     */
    id: string & tags.Format<"uuid">;

    /**
     * User's email address used for authentication and account recovery.
     * Must be in valid email format and unique across all user accounts.
     * This is the primary login identifier.
     */
    email: string & tags.Format<"email">;

    /**
     * User account creation timestamp in UTC. This value is immutable and
     * records when the user first registered.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last modification timestamp. Updated whenever user profile
     * information or password is changed. Enables tracking of account
     * activity.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp. If null, the account is active. If set, the
     * account is marked for deletion but data is retained for compliance
     * and potential recovery within retention period.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp of the user's most recent activity (login or API request).
     * Updated with each authenticated request. Used to identify inactive
     * accounts for monitoring and engagement analysis.
     */
    last_active_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * User authentication credentials for login operation.
   *
   * This DTO accepts email and password credentials for user authentication.
   * The email must be a valid email address associated with an existing user
   * account, and the password must match the securely stored password hash
   * for that user.
   *
   * The login operation validates these credentials against the user database
   * and returns JWT tokens upon successful authentication. Password
   * validation uses secure comparison algorithms to prevent timing attacks
   * and credential enumeration.
   *
   * Session context fields (ip, href, referrer) are captured during login to
   * record the connection metadata and enable security monitoring. The IP
   * address can be extracted from the request context, but href and referrer
   * are provided by the client to indicate the page or entry point where
   * login was initiated.
   */
  export type ILogin = {
    /**
     * User's email address used for authentication. Must be in valid email
     * format and match an existing user account in the system.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password in plain text form for credential verification. The
     * backend validates this against the securely stored password hash
     * (password_hash) without ever storing the plain text password.
     */
    password: string;

    /**
     * Client IP address for session tracking (OPTIONAL - server can extract
     * from request, but client may provide for SSR or proxy scenarios).
     */
    ip?: string | null | undefined;

    /**
     * Connection URL representing the current page or entry point where the
     * login was initiated. This is the URL of the page containing the login
     * form.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referrer header or source that led to the login page. May
     * indicate if user came from bookmark, search, external link, or direct
     * access.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Refresh token submission for session extension.
   *
   * This DTO accepts a refresh token previously issued during a successful
   * login or previous refresh operation. The refresh token is validated for
   * authenticity, integrity, and expiration status before issuing new
   * tokens.
   *
   * Refresh token validation checks the token's cryptographic signature,
   * embedded expiration time, and user association. Valid refresh tokens
   * result in issuing new access and refresh tokens, with the old refresh
   * token logically invalidated (not revoked, but replaced by a newer
   * token).
   */
  export type IRefresh = {
    /**
     * Valid refresh token previously issued during login or prior refresh
     * operation. Must be a properly formatted JWT with valid signature and
     * non-expired expiration time.
     */
    refresh_token: string;
  };

  /**
   * Lightweight summary representation of a user account for embedding in
   * other entities.
   *
   * Provides essential user identification information without exposing
   * sensitive account details or temporal metadata. Used when user context is
   * needed in other response types.
   */
  export type ISummary = {
    /**
     * Primary key identifier for the user account. Unique across all user
     * accounts.
     */
    id: string & tags.Format<"uuid">;

    /**
     * User's email address used for authentication and account recovery.
     * This is the primary login identifier.
     */
    email: string & tags.Format<"email">;
  };
}
