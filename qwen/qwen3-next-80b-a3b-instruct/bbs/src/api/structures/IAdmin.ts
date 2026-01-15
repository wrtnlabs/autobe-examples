import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IAdmin {
  /**
   * Request body for the admin refresh token operation. Contains the refresh
   * token necessary to obtain a new access token while maintaining
   * authentication context without requiring credential re-entry. This schema
   * follows security best practices by including only the refresh token and
   * no other credentials or user identifiers.
   */
  export type IRefresh = {
    /**
     * The refresh token used to renew the admin's access token. This token
     * must be previously issued during a successful login operation and
     * still valid in the discussion_board_moderator_sessions table. It must
     * be a valid JWT token string with proper cryptographic signature.
     */
    refresh_token: string;
  };

  /**
   * Request DTO for admin authentication login. Contains email and password
   * credentials used to authenticate a moderator account against the
   * discussion_board_moderator table.
   *
   * The email field is matched against the discussion_board_users table to
   * identify the corresponding admin record. The password field is validated
   * using bcrypt comparison against the hashed password stored in the
   * discussion_board_moderator table.
   *
   * The system only allows login for moderators with active status
   * (discussion_board_moderator.status = 'active'). Suspended, banned, or
   * deleted accounts cannot authenticate.
   *
   * This operation is publicly accessible and does not require prior
   * authentication.
   *
   * The system enforces rate limiting on authentication attempts to prevent
   * brute force attacks, tracking failed attempts in the
   * discussion_board_authentication_logs table.
   *
   * Passwords are always transmitted in plain text to this endpoint and are
   * hashed server-side before storage comparison.
   */
  export type ILogin = {
    /**
     * The registered email address of the moderator account. This is
     * matched against the discussion_board_users table to identify the
     * corresponding admin record. Must be a valid email format as defined
     * in RFC 5322.
     */
    email: string & tags.Format<"email">;

    /**
     * The plaintext password credential for the moderator account. This is
     * validated against the hashed password stored in the
     * discussion_board_moderator table using bcrypt comparison. Never
     * transmit pre-hashed passwords; always send the original plaintext
     * password. This is the only field that accepts plain password input;
     * all other representations (password_hashed, hashed_password,
     * password_hash) are strictly forbidden.
     */
    password: string;
  };

  /**
   * Request body schema for the admin update article status operation.
   *
   * This schema defines the required status field to update an article's
   * publication state. Only authenticated administrators with appropriate
   * privileges can perform this operation via the
   * /admin/articles/{articleId}/status endpoint.
   *
   * The status field must be one of: 'published', 'hidden', or 'deleted'.
   * This update bypasses normal publication workflows and directly modifies
   * the article's current status in the database. The system automatically
   * creates an immutable audit record in discussion_board_article_status_logs
   * and logs the action in discussion_board_moderation_actions with the
   * administrator's authenticated identity for full accountability.
   */
  export type IUpdateArticleStatus = {
    /**
     * The target publication status for the article, determining its
     * visibility state in the discussion_board_articles table.
     *
     * - 'published': The article becomes publicly visible to all users
     * - 'hidden': The article is removed from public view but retained in the
     *   system for audit purposes
     * - 'deleted': The article is permanently removed from public view and
     *   marked for archival
     *
     * This status value triggers a corresponding entry in
     * discussion_board_article_status_logs and is recorded in
     * discussion_board_moderation_actions with the administering
     * moderator's identity. This privileged operation bypasses normal
     * publication workflows and requires admin authentication via JWT
     * token.
     */
    status: "published" | "hidden" | "deleted";
  };

  /**
   * Authorized admin response object that contains authentication credentials
   * for authenticated admin users. This schema follows the IAuthorized
   * pattern used for all authentication responses in the system. It provides
   * the essential information needed for API access: a unique user identifier
   * and a valid authentication token. The structure ensures that
   * authenticated admins can securely access protected endpoints while
   * maintaining proper session management and security protocols.
   *
   * When an admin successfully completes the join, login, or refresh
   * operations, this object is returned as the response body. The id property
   * references the admin's unique identifier in the
   * discussion_board_moderator table, and the token property contains the JWT
   * that enables API access. The token includes cryptographic signatures to
   * prevent tampering and has a defined expiration period. The system
   * enforces token validation on every protected request to maintain security
   * integrity.
   *
   * This response structure is consistent across all admin authentication
   * operations (join, login, refresh) to ensure predictable client behavior
   * and simplified authentication handling in frontend applications.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the admin account. This UUID is assigned upon
     * account creation and used for all subsequent authentication and
     * authorization operations. The ID is immutable and cannot be changed
     * after account creation. This field is always included in
     * authentication responses to identify the authenticated admin user.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Request DTO for admin account creation on the discussion board system.
   * This schema defines the required fields for registering a new moderator
   * account with elevated privileges to manage content, review reports, and
   * suspend users. The email field references the discussion_board_users
   * table for unique verification, and the password field must meet the
   * system's strength requirements for administrative access.
   *
   * This DTO is used exclusively in the POST /auth/admin/join operation and
   * is the only mechanism for creating new admin accounts in the system. The
   * registration process enforces strong password policies and requires email
   * verification before the account can be fully activated. All admin
   * accounts created through this endpoint will have immediate access to
   * moderation tools within the system.
   *
   * The creation of an admin account triggers the initialization of an
   * associated record in the discussion_board_moderator database table. The
   * system performs rigorous validation on the email field to ensure it
   * references a unique, verified user in the discussion_board_users table.
   * The password field must conform to security policies designed for
   * administrative-level access, which include minimum length, character
   * complexity, and avoidance of common patterns.
   *
   * After successful registration, the system generates an authentication
   * session and issues a JWT token pair, providing immediate access to the
   * complete set of moderation capabilities within the platform. This process
   * is subject to audit logging for compliance purposes.
   */
  export type IJoin = {
    /**
     * Admin's unique email address used for authentication and system
     * notifications. This field is validated against the
     * discussion_board_users table to ensure uniqueness and must be a valid
     * business email format, not a personal domain like gmail or yahoo.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password for the new admin account. The system will hash
     * this password using bcrypt before storing in the
     * discussion_board_moderator table. The password must meet the system's
     * strength requirements for administrative accounts, including a
     * minimum length of 12 characters, at least one uppercase letter, one
     * lowercase letter, one numeric digit, one special character, and must
     * not contain common passwords or dictionary words. The password must
     * be provided in plain text in the request and will be hashed
     * server-side for secure storage.
     */
    password: string;
  };
}
