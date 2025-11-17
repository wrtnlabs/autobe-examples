import { tags } from "typia";

import { ICommunityForumAuthorizationToken } from "./ICommunityForumAuthorizationToken";

export namespace ICommunityForumCommunityAdministrator {
  /**
   * Registration information for creating a new administrator account in the
   * community forum platform.
   *
   * This DTO is used to promote an existing user account to administrative
   * privileges. The user must first have a standard user account before being
   * granted administrative permissions. The process requires specifying both
   * the user reference and the administrative role level.
   *
   * Administrators are users with elevated permissions allowing them to
   * manage various aspects of the community forum platform. System
   * administrators have complete access to all platform features and user
   * accounts, while community administrators have more limited permissions
   * focused on specific community management.
   *
   * The registration process requires careful verification of the base user
   * account's eligibility for administrative privileges. The system should
   * implement additional security measures for administrator account
   * creation, including multi-factor authentication and approval workflows.
   *
   * Upon successful registration, the system generates and returns initial
   * JWT authorization tokens that allow the administrator to access protected
   * administrative endpoints. These tokens include appropriate claims to
   * identify the user's administrative role and permissions scope.
   *
   * After registration, administrators can use standard authentication
   * endpoints for subsequent logins. This endpoint should be used only once
   * per administrator account creation to maintain proper audit trails of
   * administrative privilege assignments.
   */
  export type ICreate = {
    /** Reference to the base user account. community_forum_users.id. */
    community_forum_user_id: string & tags.Format<"uuid">;

    /**
     * Administrative role level that defines the scope of permissions for
     * this administrator. Standard roles include 'system_admin' for full
     * platform access or 'community_admin' for community-specific
     * administration. System administrators have complete access to all
     * platform features, while community administrators have more limited
     * permissions focused on specific community management.
     */
    role?: "system_admin" | "community_admin" | undefined;
  };

  /**
   * Authorization response containing administrator identity and
   * authentication tokens.
   *
   * This DTO provides the complete authorization context for an authenticated
   * administrator, including both their unique identifier and the tokens
   * needed for API access.
   *
   * The structure contains essential identification information that links
   * the administrator to their base user account, ensuring proper access
   * control and audit trails. The included token object provides both access
   * and refresh capabilities with appropriate expiration tracking.
   *
   * This response format is standardized across all administrator
   * authentication endpoints (join, login, refresh) to ensure consistent
   * client-side handling of authentication state.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated administrator. */
    id: string & tags.Format<"uuid">;

    /** Reference to the base user account. {@link community_forum_users.id}. */
    community_forum_user_id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: ICommunityForumAuthorizationToken;
  };

  /**
   * Administrator authentication credentials and session context.
   *
   * This DTO contains all necessary information to authenticate an
   * administrator and establish a secure session. The combination of
   * credential validation and session context provides both security
   * verification and audit trail capabilities.
   *
   * The session tracking information (href, referrer, ip) enables
   * comprehensive security monitoring, helping detect suspicious login
   * attempts and providing valuable analytics for platform usage patterns.
   *
   * Proper validation of all fields ensures protection against common
   * authentication attacks while maintaining detailed logs for compliance and
   * security auditing purposes.
   */
  export type ILogin = {
    /**
     * User's email address used for authentication and communication. Must
     * be unique across all users.
     */
    email: string & tags.Format<"email">;

    /** Plain text password for user authentication. */
    password: string;

    /**
     * IP address from which the session was initiated. This information is
     * used for security monitoring and rate limiting.
     *
     * Clients can optionally provide this for server-side applications
     * where IP extraction may be complex due to proxy configurations. For
     * browser-based clients, the server typically extracts this
     * automatically from the connection context.
     *
     * Including IP context helps with security auditing and detecting
     * suspicious login patterns across different geographic locations.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Connection URL used to establish the session. Required for session
     * tracking and security auditing.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led to the session creation. Used for security
     * monitoring and usage analytics.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Refresh token for obtaining new access tokens. This DTO is used for the
   * refresh endpoint to extend the administrator's session.
   */
  export type IRefresh = {
    /**
     * Refresh token for obtaining new access tokens. This token is used to
     * extend the administrator's session without requiring
     * re-authentication.
     */
    refresh_token: string;
  };
}
