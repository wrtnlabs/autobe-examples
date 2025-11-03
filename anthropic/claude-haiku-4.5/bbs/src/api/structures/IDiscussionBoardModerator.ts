import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardModerator {
  /**
   * Moderator login request payload containing email, password, and session
   * context information for administrator authentication.
   *
   * This DTO defines the complete set of credentials and session context
   * required for moderator authentication. The email and password fields are
   * used to verify the moderator's identity against the
   * discussion_board_moderators table, while the href and referrer fields
   * provide connection context for audit logging and security tracking.
   *
   * When a moderator submits this payload via the POST /auth/moderator/login
   * endpoint, the backend validates the email exists in the
   * discussion_board_moderators table, verifies the provided password matches
   * the stored password_hash using secure comparison, confirms the
   * moderator's account_status is 'active' (not 'inactive' or 'removed'), and
   * creates a new session record in discussion_board_moderator_sessions.
   *
   * The IP address is optional and can be extracted from request headers by
   * the backend if not provided. The href and referrer are mandatory for
   * proper audit trail generation and security context recording. Upon
   * successful authentication, the system returns
   * IDiscussionBoardModerator.IAuthorized containing JWT tokens and moderator
   * identity information, enabling all subsequent authenticated requests to
   * moderation endpoints.
   *
   * Security considerations: Passwords are transmitted in plain text only
   * over HTTPS connections and hashed immediately upon receipt using
   * industry-standard algorithms. Failed login attempts (>5 in 15 minutes)
   * trigger temporary account lockout. Password reset functionality is
   * available for forgotten credentials.
   */
  export type ILogin = {
    /**
     * Moderator's registered email address used for authentication. Must
     * match exactly with the email field stored in
     * discussion_board_moderators table. Email is case-insensitive for
     * login purposes but stored as provided in database.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for moderator authentication. Backend verifies
     * against password_hash stored in discussion_board_moderators table
     * using secure hashing algorithm (bcrypt, scrypt, or argon2). Minimum 8
     * characters containing uppercase, lowercase, and numbers. Never
     * transmitted or stored in plain text after authentication.
     */
    password: string;

    /**
     * Client IP address for session tracking and security auditing.
     * OPTIONAL - server can extract from request headers, but client may
     * provide for SSR or special cases. Used to detect suspicious login
     * locations or unauthorized access attempts. Stored in
     * discussion_board_moderator_sessions for connection context.
     */
    ip?: string | null | undefined;

    /**
     * Current page URL (connection origin) where moderator initiated login.
     * MANDATORY - client must provide the URL of the page where login form
     * was submitted. Used for session context tracking and security logging
     * in discussion_board_moderator_sessions. Examples:
     * 'https://admin.example.com/login' or
     * 'https://app.example.com/admin/dashboard'.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer URL indicating page moderator came from before visiting
     * login page. MANDATORY - client must provide referrer information for
     * audit trail. Used to track how moderator accessed the login interface
     * and for security analytics. Can be empty string for direct
     * navigation.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Successful moderator authentication response containing moderator
   * identity and JWT authentication tokens.
   *
   * This DTO is returned upon successful moderator registration (join
   * endpoint) or token refresh, providing the authenticated moderator with
   * necessary credentials and identity information to access administrative
   * features.
   *
   * The response includes the moderator's unique identifier, email address,
   * account lifecycle timestamps (creation and modification), current account
   * status reflecting access restrictions, and complete JWT token information
   * (access token, refresh token, and expiration timestamps). The permissions
   * array specifies which administrative actions the moderator is authorized
   * to perform, including content moderation, user management, and audit log
   * access.
   *
   * The access token should be included in the Authorization header (Bearer
   * scheme) for all subsequent requests to protected moderation endpoints.
   * The refresh token enables the moderator to extend their session by
   * obtaining new access tokens when the current token approaches expiration,
   * without requiring password re-entry.
   *
   * Moderators receive full moderation permissions enabling them to: view all
   * articles and comments regardless of author, edit or delete any content,
   * suspend or ban user accounts, access moderation dashboards, view audit
   * logs, and perform all administrative enforcement actions. Moderator
   * accounts are separate from regular member accounts to maintain clear
   * separation of administrative privileges.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated moderator. System-generated
     * UUID from discussion_board_moderators.id. Used to identify the
     * moderator throughout the system and in all subsequent authenticated
     * requests. Included in JWT token claims for request validation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Moderator's email address as stored in the
     * discussion_board_moderators table. Used for display and
     * identification of the authenticated moderator. Included in JWT token
     * claims. Email is unique constraint in the moderators table ensuring
     * no duplicate emails across administrative accounts.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when the moderator account was created in ISO 8601 UTC
     * format. System-generated at account creation and immutable
     * thereafter. Tracks when moderator access was granted to the system.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the moderator account was last modified in ISO 8601
     * UTC format. Updated when moderator details change such as password
     * resets or permission modifications. Tracks the most recent account
     * modification for audit purposes.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Current status of moderator account indicating whether the moderator
     * can access administrative features. Valid values: 'active'
     * (performing moderation duties), 'inactive' (access suspended),
     * 'removed' (access permanently revoked). Controls whether moderator
     * can authenticate and access admin features.
     */
    account_status: "active" | "inactive" | "removed";

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Array of permission strings indicating what administrative actions
     * this moderator can perform. Typical permissions include:
     * 'article:view:all', 'article:edit:any', 'article:delete:any',
     * 'comment:view:all', 'comment:edit:any', 'comment:delete:any',
     * 'user:view:all', 'user:suspend', 'user:ban', 'moderation:view:logs',
     * 'moderation:create:log'. Permissions determine access to moderation
     * dashboard features and content management operations. All moderators
     * have full moderation permissions in current implementation.
     */
    permissions: string[];
  };

  /**
   * Moderator account registration request containing email, password, and
   * session context information.
   *
   * This DTO captures the necessary information for creating new moderator
   * administrator accounts. Unlike member registration which may be open,
   * moderator account creation is administratively restricted and may require
   * special authorization to prevent unauthorized privilege escalation.
   *
   * The registration accepts email address and plain-text password which the
   * backend hashes using industry-standard algorithms before storage. Session
   * context fields (ip, href, referrer) are captured during the registration
   * request for audit trail and security tracking purposes.
   *
   * Email must be unique across all existing moderator accounts; registration
   * fails if email is already registered. Password must meet security
   * requirements (minimum 8 characters including uppercase, lowercase, and
   * numbers) to ensure adequate authentication strength.
   *
   * Session context information enables the system to track where moderators
   * registered from, detect suspicious registration patterns (multiple
   * registrations from different IPs in short timeframe), and maintain
   * security audit logs of administrative access points.
   */
  export type IJoin = {
    /**
     * Moderator's email address used for authentication and administrative
     * account management. Must be unique across all moderators. Used for
     * moderator login, password recovery, and administrative notifications.
     * Email is case-insensitive and must be in valid email format
     * (user@domain.com).
     */
    email: string & tags.Format<"email">;

    /**
     * Moderator password in plain text for account creation. Will be hashed
     * using industry-standard algorithms (bcrypt, scrypt, or argon2) before
     * storage. Minimum 8 characters required, must include at least one
     * uppercase letter, one lowercase letter, and one number for adequate
     * security. Never stored in plaintext. Client sends plain text during
     * registration; server hashes and stores in password_hash field.
     */
    password: string & tags.MinLength<8>;

    /**
     * Client IP address of the connection where moderator initiated
     * registration or authentication. Captured for security auditing and
     * anomaly detection. Stored in moderator_sessions table to track login
     * locations and identify suspicious registration patterns. Used to flag
     * registrations from multiple IPs in short timeframe.
     */
    ip: string;

    /**
     * URL of the registration page or authentication endpoint where
     * moderator initiated the account creation process. Provides context
     * about moderator's entry point into the administrative interface.
     * Stored in moderator_sessions table as part of session tracking and
     * security audit trail.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer URL indicating where moderator came from before
     * accessing the registration interface. Tracks traffic sources and
     * moderator navigation patterns. Stored in moderator_sessions table to
     * understand administrative user journeys and identify external
     * referral sources to administrative registration.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Moderator token refresh request containing refresh token for obtaining
   * new access credentials.
   *
   * This DTO enables moderators to extend their authenticated sessions by
   * exchanging a valid refresh token for a new access token. The operation
   * does not require the moderator to re-enter their password, allowing
   * seamless session continuation when access tokens approach expiration.
   *
   * The refresh token must be a valid JWT token previously issued during
   * moderator authentication (login or previous refresh) and stored in the
   * moderator_sessions table. The system validates that the refresh token has
   * not expired (checking expired_at timestamp is null or in the future), the
   * associated moderator account still exists and is active (account_status =
   * 'active'), and no password resets have invalidated the token.
   *
   * Upon successful validation, the system generates a new access token with
   * 15-minute expiration and optionally a new refresh token with 7-day
   * expiration. If the refresh token is expired, invalid, or the moderator
   * account has been suspended or deleted, the operation fails with
   * appropriate error message prompting the moderator to authenticate again.
   *
   * Refresh operations are logged for audit trail tracking to monitor token
   * renewal patterns and detect potential token theft scenarios where
   * excessive rapid refresh attempts occur.
   */
  export type IRefresh = {
    /**
     * Valid refresh token issued during previous moderator authentication
     * or token refresh. Used to generate new access token without requiring
     * password re-entry. Must match a refresh token in
     * discussion_board_moderator_sessions table that has not expired
     * (expired_at is null) and is associated with an active moderator
     * account (account_status = 'active'). Refresh tokens have 7-day
     * expiration window.
     */
    refresh_token: string;
  };
}
