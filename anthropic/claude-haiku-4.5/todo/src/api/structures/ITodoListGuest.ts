import { tags } from "typia";

import { ITodoListTokenBlacklist } from "./ITodoListTokenBlacklist";

export namespace ITodoListGuest {
  /**
   * Request body for guest user registration.
   *
   * Contains the minimal credentials required to create a new guest account:
   * email and password. The email must be globally unique across all users in
   * the system. Password is transmitted as plaintext and securely hashed by
   * the backend before storage.
   *
   * No pre-hashed passwords are accepted. The backend takes full
   * responsibility for secure password handling including hashing with bcrypt
   * cost factor 10 or higher.
   */
  export type ICreate = {
    /**
     * User's email address for guest account registration. Must be unique
     * and will be normalized to lowercase for case-insensitive login
     * matching.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for the guest account. Will be securely hashed
     * using bcrypt (cost factor 10) before storage. Backend performs all
     * hashing - client sends plaintext password.
     */
    password: string & tags.MinLength<1>;
  };

  /**
   * Authenticated guest user with valid JWT tokens for session access.
   *
   * This DTO represents a guest user that has successfully authenticated and
   * received valid JWT tokens. It is returned from both the guest join
   * operation (initial registration) and the guest refresh operation (token
   * renewal).
   *
   * The guest user record is temporary and session-based. Guest accounts do
   * not have persistent user profiles and are primarily identified by their
   * session tokens. The id field serves as the session identifier for
   * tracking purposes.
   *
   * The token property contains the JWT tokens (access and refresh) that the
   * guest must use for subsequent authenticated API requests.
   */
  export type IAuthorized = {
    /**
     * Unique session identifier for the guest user. This UUID represents
     * the current authenticated session and is used for session tracking
     * and revocation purposes.
     */
    id: string & tags.Format<"uuid">;

    /**
     * User's email address used for login and account recovery. Must be
     * unique across all users. Stored in lowercase for case-insensitive
     * matching.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when user account was created. Recorded in UTC timezone,
     * ISO 8601 format.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent account modification. Updated when
     * password changes or account information is modified.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of user's most recent successful login. Used for tracking
     * user activity.
     */
    last_login_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: ITodoListTokenBlacklist;
  };

  /**
   * Guest user refresh token request for renewing expired JWT access tokens.
   *
   * This DTO is used when a guest user's access token has expired but their
   * refresh token remains valid. The refresh operation validates the provided
   * refresh token against the session and token management system to issue
   * new JWT tokens.
   *
   * The refresh token must be obtained from a previous guest join operation
   * and must not have expired. The underlying session must remain active (not
   * logged out) and within the absolute timeout window (30 days maximum).
   *
   * Session activity is tracked and refreshed during this operation. If the
   * guest's session has been inactive for more than 7 days since last
   * activity, the refresh request will be rejected and the guest must
   * re-register.
   */
  export type IRefresh = {
    /**
     * Valid refresh token from previous authentication response. This token
     * is validated against the todo_list_sessions table to ensure the
     * session is still active and the token has not expired. The token must
     * be a valid JWT that was issued by a previous join or refresh
     * operation.
     */
    refresh_token: string;
  };
}
