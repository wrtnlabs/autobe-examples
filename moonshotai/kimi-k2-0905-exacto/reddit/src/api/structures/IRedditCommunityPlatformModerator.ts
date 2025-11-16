import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCommunityPlatformModerator {
  /**
   * Schema for platform moderator self-registration requests. Contains
   * essential registration data plus session context fields required for
   * immediate session creation upon successful account creation.
   *
   * Platform moderators are system-wide administrators with comprehensive
   * platform management authority. Self-registration creates new moderator
   * accounts with immediate authentication capabilities.
   *
   * Session context fields (ip, href, referrer) are mandatory for self-signup
   * operations to establish initial session records in the
   * platform_moderator_sessions table for security tracking and compliance
   * requirements.
   */
  export type ICreate = {
    /**
     * Unique display name for the platform moderator across the entire
     * platform. Must be different from any existing moderator or member
     * account nickname. Alphanumeric characters, underscores, and hyphens
     * allowed.
     */
    nickname: string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">;

    /**
     * Verified email address for platform moderator communications and
     * secure authentication. Must be unique across all platform accounts
     * and follow standard email format validation.
     */
    email: string & tags.MaxLength<255> & tags.Format<"email">;

    /**
     * Secure platform moderator password. Should contain at least 8
     * characters with mixed case, numbers, and special characters as
     * recommended for administrative accounts. Stored as secure hash after
     * validation.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<255>;

    /**
     * Client IP address for initial session creation and security tracking.
     * Server can extract from request headers, but client may provide for
     * SSR scenarios. Optional field for enhanced audit trail.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) required for initial session
     * establishment and audit trail creation. Provides authentication
     * context for security monitoring.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) required for complete session
     * context and navigation tracking. Essential for comprehensive audit
     * records and security analysis.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Authentication response for platform moderator login containing identity
   * and authorization tokens. Represents the successful authentication result
   * for platform administrators with comprehensive identity verification and
   * token issuance. Provides all necessary information to begin authenticated
   * platform management operations including user credentials, account state,
   * and cryptographic tokens for subsequent API access. Optimized for
   * authentication responses without circular references while maintaining
   * complete administrative context.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated platform moderator. Generated
     * automatically using UUID v4 standards upon account creation to ensure
     * global uniqueness across the platform. Used for all subsequent
     * authentication and authorization operations.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique display name for the platform moderator across the entire
     * platform. Serves as the moderator's public identifier visible
     * throughout all community interactions. Must be unique across all
     * platform accounts to prevent conflicts and maintain clear
     * identification.
     */
    nickname: string;

    /**
     * Verified email address for platform moderator communications and
     * secure authentication. Used for system notifications, security
     * alerts, and administrative communications. Validated against RFC 5322
     * email format standards and confirmed unique across platform
     * accounts.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when the platform moderator account was created.
     * Automatically populated during registration using server-side
     * timestamp to ensure accuracy across different client time zones.
     * Stored in ISO 8601 format for consistency and timezone independence.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the platform moderator account was last updated.
     * Automatically maintained by the system to track profile changes,
     * privilege modifications, or administrative updates. Enables audit
     * trail functionality and change tracking for security monitoring.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp for account management and administrative
     * auditing. Used to support account recovery, temporary suspensions,
     * and comprehensive audit trails. NULL indicates active account while
     * timestamp indicates soft-deletion status for administrative cleanup
     * workflows.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Platform moderator login credentials with comprehensive session context
   * for authentication and audit tracking. Represents the complete
   * authentication request containing user credentials plus environmental
   * metadata for security monitoring. Supports flexible credential formats
   * while maintaining strict audit requirements for platform administrative
   * access. Includes session tracking information essential for security
   * monitoring and forensic analysis of administrative actions.
   */
  export type ILogin = {
    /**
     * Platform moderator email address for authentication. Accepts either
     * the moderator's registered email address or nickname as flexible
     * login identifier. Provides convenience for platform administrators
     * who may manage multiple authentication methods. Must be valid email
     * format when email is used as identifier.
     */
    email: string & tags.Format<"email">;

    /**
     * Platform moderator password for authentication. Must correspond to
     * the secure password hash stored in the
     * reddit_community_platform_moderators database table. Subject to
     * password complexity requirements including minimum length, character
     * diversity, and security standards appropriate for administrative
     * accounts.
     */
    password: string;

    /**
     * Client IP address for session tracking. Automatically captured for
     * security monitoring, audit logging, and geographic access analysis.
     * Supports forensic investigation of authentication events and helps
     * identify suspicious login patterns from unexpected locations.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) - MANDATORY. Specifies the
     * originating URL where the authentication request was initiated.
     * Critical for security tracking, session correlation, and audit trail
     * maintenance. Must be valid URI format pointing to the client
     * application's login interface.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) - MANDATORY. Identifies the
     * preceding page URL in the user's navigation history for
     * authentication context. Enables comprehensive session tracking and
     * helps maintain authentication flow integrity throughout the platform
     * management workflow.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Lightweight platform moderator representation for assignment and
   * reference. Contains essential moderator information for display and
   * assignment purposes in management interfaces, audit logs, and
   * administrative workflows. This summary view provides the core identity
   * data needed for moderator recognition and contact across the platform.
   * Optimized for efficient data transfer in list views, dropdown selections,
   * and cross-reference scenarios where full moderator details are not
   * required."
   */
  export type ISummary = {
    /** Primary Key. Unique identifier for the platform moderator */
    id: string & tags.Format<"uuid">;

    /**
     * Unique display name for the platform moderator across the entire
     * platform. Moderator's public identifier
     */
    nickname: string;

    /**
     * Verified email address for platform moderator communications and
     * secure authentication. Moderator's registered email address
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Refresh token request for platform moderator authentication session
   * extension with comprehensive token validation and security
   * considerations.
   */
  export type IRefresh = {
    /**
     * Valid JWT refresh token for platform moderator session renewal. Must
     * be a previously issued refresh token that has not expired or been
     * revoked. Used to maintain extended administrative sessions while
     * conducting platform-wide moderation activities without requiring
     * re-authentication
     */
    refresh_token: string;
  };
}
