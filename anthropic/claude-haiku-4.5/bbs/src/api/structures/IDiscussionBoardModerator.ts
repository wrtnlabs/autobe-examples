import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardModerator {
  /**
   * Moderator account creation request.
   *
   * This DTO is used to register new moderator accounts in the discussion
   * board system. The operation creates a new entry in the
   * discussion_board_moderators table with administrative permissions for
   * content moderation and user management.
   *
   * Email must be unique across all moderator accounts and follows valid
   * email format. Username must also be unique, constrained to 3-50
   * characters, and contain only alphanumeric characters and underscores.
   * Password must meet complexity requirements with a minimum of 8 characters
   * including uppercase, lowercase, number, and special character.
   *
   * The operation stores a bcrypt-hashed password with minimum 12 salt rounds
   * for security. The newly created moderator account is assigned 'full'
   * moderation tier (all moderation permissions) and initialized with
   * account_status as 'active'. However, email_verified is set to false
   * initially, and the moderator cannot fully access moderation tools until
   * verifying their email address through a confirmation link. This endpoint
   * is public and requires no prior authentication, allowing new moderators
   * to self-register within the system.
   */
  export type ICreate = {
    /**
     * Moderator email address for account verification and communication.
     * Must be unique across all moderator accounts and follow valid email
     * format (user@domain.com).
     */
    email: string & tags.Format<"email">;

    /**
     * Moderator account password. Plain text password that must meet
     * complexity requirements: minimum 8 characters with uppercase,
     * lowercase, number, and special character. Backend hashes with bcrypt
     * (12 salt rounds) before storing in password_hashed column.
     */
    password: string & tags.MinLength<8>;

    /**
     * Unique moderator username for account identification. Must be 3-50
     * characters containing only alphanumeric characters and underscores.
     * No spaces or special characters allowed.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">;
  };

  /**
   * Authenticated moderator response with JWT access and refresh tokens after
   * successful login, registration, or token refresh.
   *
   * Contains the moderator's unique identifier and JWT token information
   * needed for authenticated API requests. The access token is used in
   * Authorization headers for subsequent moderation operations. The refresh
   * token enables obtaining new access tokens without re-entering
   * credentials.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated moderator account. */
    id: string & tags.Format<"uuid">;

    /**
     * Email address used for moderator authentication and account recovery.
     * Must be unique across all moderator accounts.
     */
    email: string & tags.Format<"email">;

    /**
     * Public display name for moderation actions and audit trail. Must be
     * unique across all moderators. 3-50 characters, alphanumeric and
     * underscore only. Immutable after creation.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">;

    /**
     * Whether the moderator's email address has been verified through
     * confirmation link. Account cannot access moderation tools until
     * verified.
     */
    email_verified: boolean;

    /**
     * Current account status. Valid values: 'active' (normal operation),
     * 'suspended' (temporary ban from moderation), 'deleted' (marked for
     * deletion).
     */
    account_status: "active" | "suspended" | "deleted";

    /**
     * Moderator permission level. Current value: 'full' (all moderation
     * permissions). Reserved for future role differentiation.
     */
    moderation_tier: "full";

    /** Timestamp when the moderator account was created in ISO 8601 format. */
    created_at: string & tags.Format<"date-time">;

    /** Timestamp of the most recent account modification in ISO 8601 format. */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when moderator account was deleted (soft delete). Null for
     * active accounts. Retained for compliance purposes.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp of the most recent successful login to moderation
     * dashboard. Null if account has never been logged in.
     */
    last_login_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Moderator authentication request with email and password credentials.
   *
   * This DTO is used for authenticating existing moderators to the discussion
   * board system. It accepts the moderator's registered email address and
   * password for credential-based authentication.
   *
   * The email address must match an existing moderator account in the
   * discussion_board_moderators table and be verified (email_verified =
   * true). The password is provided in plain text and validated against the
   * bcrypt-hashed password_hash field in the database. All moderator
   * passwords must meet complexity requirements: minimum 8 characters with
   * uppercase, lowercase, number, and special character.
   *
   * Authentication requires the moderator account to have account_status =
   * 'active'. Suspended or deleted moderator accounts are rejected from
   * login.
   *
   * Session context fields (ip, href, referrer) capture connection metadata
   * for audit trail purposes. The href and referrer fields are mandatory and
   * represent the current page URL and previous page URL respectively. The ip
   * field is optional and represents the client IP address (server can
   * extract this from request context, but client may provide for SSR
   * scenarios).
   *
   * Upon successful authentication, the operation returns
   * IDiscussionBoardModerator.IAuthorized with JWT access and refresh tokens
   * for authenticated access to moderation features.
   */
  export type ILogin = {
    /**
     * Moderator email address for authentication. Must match the email
     * registered in the discussion_board_moderators table and be verified
     * (email_verified = true). Email format must be valid
     * (user@domain.com).
     */
    email: string & tags.Format<"email">;

    /**
     * Moderator password in plain text for credential verification. The
     * password is validated against the bcrypt-hashed password_hash field
     * stored in the database. Must meet complexity requirements: minimum 8
     * characters with uppercase, lowercase, number, and special character.
     */
    password: string & tags.MinLength<8>;

    /**
     * Client IP address for session tracking (OPTIONAL - server can extract
     * from request context, but client may provide for SSR scenarios).
     * Valid IP address format (IPv4 or IPv6) when provided.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL representing the current page URL from which the login
     * request was initiated. This field is MANDATORY and used for session
     * audit trail and security tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL representing the previous page URL that led to the
     * current login page. This field is MANDATORY and used for session
     * context and referral tracking. Can be empty string for direct
     * access.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Request body for refreshing a moderator's JWT access token using a valid
   * refresh token.
   *
   * This operation accepts a refresh token previously issued during login or
   * registration. The refresh token is validated to ensure it is valid, has
   * not expired, and belongs to an existing active and email-verified
   * moderator account. Upon successful validation, a new access token is
   * issued for continued authenticated access to moderation features.
   *
   * The operation checks that the moderator's account_status is 'active' and
   * email_verified is true. If either condition fails, the token refresh is
   * rejected to prevent access by suspended or unverified accounts.
   */
  export type IRefresh = {
    /**
     * Valid refresh token issued during prior authentication (login or
     * registration). Used to obtain a new access token for continued
     * authenticated access to moderation features without re-entering
     * credentials.
     *
     * The refresh token is validated against the moderator's active session
     * in the discussion_board_moderator_sessions table. If the token is
     * invalid, expired, or the associated moderator account has been
     * suspended or deleted, the refresh attempt is rejected.
     */
    refresh_token: string;
  };

  /**
   * Lightweight summary representation of a moderator for reference contexts.
   *
   * Provides essential moderator identification information when embedding
   * moderator references in audit logs, violation records, and other
   * moderation-related contexts where full moderator details are
   * unnecessary.
   *
   * Includes only the unique identifier and display name to keep response
   * payloads compact while enabling moderator identification and
   * accountability tracking. Used in nested references throughout the
   * moderation system.
   */
  export type ISummary = {
    /**
     * Unique identifier for the moderator account. Primary key reference
     * enabling system-wide identification and linking of moderator records
     * and actions.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display name of the moderator shown throughout the platform. Used for
     * moderator identification in audit logs and moderation dashboards.
     * Provides human-readable reference for accountability tracking.
     */
    username: string;
  };
}
