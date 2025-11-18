import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoListGuest {
  /**
   * Guest user registration request data for creating a new account in the
   * todo_list_users table.
   *
   * This schema represents the information required from a user during the
   * registration process. It captures the essential credentials, optional
   * profile information, and session context metadata needed to create a new
   * guest account with immediate session establishment.
   *
   * The email field serves as the unique identifier for authentication and
   * must conform to standard email format validation. The password field
   * accepts the user's plain-text password, which the backend will hash using
   * bcrypt before storing in the password_hash column of the todo_list_users
   * table.
   *
   * The optional name field allows users to provide a display name for
   * personalization purposes. Session context fields (ip, href, referrer) are
   * included to enable immediate session creation in the
   * todo_list_user_sessions table upon successful registration, providing
   * audit trail and security monitoring capabilities.
   *
   * All timestamp fields (created_at, updated_at, deleted_at) are
   * system-managed and excluded from this creation request. Security
   * considerations: The password is transmitted in plain text over HTTPS and
   * immediately hashed server-side. The email uniqueness is enforced by
   * database constraints to prevent duplicate accounts.
   */
  export type ICreate = {
    /**
     * User's email address for authentication and communication.
     *
     * Must be unique across all users in the todo_list_users table. This
     * field serves as the primary login identifier and is validated against
     * RFC 5322 email format standards.
     *
     * The database enforces uniqueness through an index constraint,
     * preventing duplicate registrations with the same email address.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password in plain text format for account security.
     *
     * This password will be cryptographically hashed using bcrypt with a
     * cost factor of at least 12 before being stored in the password_hash
     * field of the database. The plain text password is never stored.
     *
     * Password strength requirements should include minimum length of 8
     * characters. The client should enforce additional complexity
     * requirements as needed.
     */
    password: string & tags.MinLength<8>;

    /**
     * Optional display name for the guest user account.
     *
     * This field provides a human-friendly identifier for personalization
     * purposes. If not provided, the system may use the email address or a
     * default placeholder for display purposes.
     *
     * The name can be updated later through profile management endpoints.
     */
    name?: string | undefined;

    /**
     * Client IP address for session tracking and security monitoring.
     *
     * This optional field captures the IP address from which the guest
     * registration request originates. While the server can extract this
     * from the HTTP request headers, clients may provide it explicitly for
     * server-side rendering scenarios.
     *
     * The IP address is stored in the todo_list_user_sessions table as part
     * of the session record created during registration. It supports audit
     * trails, security monitoring, and helps detect suspicious account
     * creation patterns.
     *
     * Both IPv4 and IPv6 address formats are supported. If not provided by
     * the client, the backend will extract it from the request context.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL indicating the current page from which registration
     * was initiated.
     *
     * This required field captures the full URL of the page where the guest
     * user submitted their registration request. It represents the
     * connection context at the moment of account creation.
     *
     * The href value is stored in the todo_list_user_sessions table as part
     * of the initial session record. This information supports user
     * behavior analysis, conversion tracking, and security auditing by
     * showing the exact entry point for new guest registrations.
     *
     * Must be a valid URI format. Examples include application page URLs,
     * landing pages, or registration form locations.
     */
    href: string;

    /**
     * Referrer URL indicating the previous page before the registration
     * page.
     *
     * This required field captures the URL of the page that led the user to
     * the registration form. It represents the navigation context that
     * brought the guest to the sign-up process.
     *
     * The referrer value is stored in the todo_list_user_sessions table as
     * part of the initial session record. This supports marketing
     * attribution, user journey analysis, and helps understand how guests
     * discover and access the registration functionality.
     *
     * Must be a valid URI format. Can be an empty string for direct
     * navigation (when users directly access the registration page without
     * a referrer).
     */
    referrer: string;
  };

  /**
   * Response body for successful guest user token refresh operations.
   * Contains the guest user's identifier and newly issued JWT tokens.
   *
   * This DTO is returned after successful validation of a refresh token,
   * providing the client with updated authentication credentials. The new
   * token pair extends the guest's session without requiring
   * re-authentication.
   *
   * The response enables the client to update its stored tokens and continue
   * making authenticated requests to the API. The old refresh token is
   * invalidated as part of the token rotation security strategy.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated guest user from the
     * todo_list_users table. This UUID serves as the primary key for the
     * guest account and is used to associate todos and sessions with this
     * specific guest user.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Request body for refreshing JWT tokens for guest users. Contains the
   * refresh token that will be validated and exchanged for a new pair of
   * access and refresh tokens.
   *
   * This DTO is used when a guest user's access token has expired but their
   * refresh token is still valid. The refresh token must be transmitted
   * securely over HTTPS and should be stored securely on the client side.
   *
   * The refresh operation implements token rotation for enhanced security -
   * the old refresh token is invalidated upon successful refresh, and a new
   * refresh token is issued along with a new access token.
   */
  export type IRefresh = {
    /**
     * Valid refresh token previously issued during guest registration or
     * last token refresh. This token is used to authenticate the refresh
     * request and must not be expired or revoked. The system validates this
     * token against the todo_list_user_sessions table to ensure it belongs
     * to an active guest session.
     */
    refresh_token: string;
  };
}
