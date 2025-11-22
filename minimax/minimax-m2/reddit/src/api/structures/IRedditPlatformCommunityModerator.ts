import { tags } from "typia";

import { IRedditPlatformRegisteredUser } from "./IRedditPlatformRegisteredUser";
import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditPlatformCommunityModerator {
  /**
   * Request body for creating new community moderator accounts with enhanced
   * permissions for community management.
   *
   * This DTO enables community moderation appointments by creating accounts
   * with elevated permissions based on community appointment authority. The
   * creation process validates moderator qualifications, establishes initial
   * community access, and sets up moderation-specific tracking fields.
   *
   * The creation workflow includes registration of unique authentication
   * credentials, validation of appointed authority, assignment of moderation
   * privileges, and initialization of tracking fields including zero
   * moderation actions and appointment timestamp. The account is created with
   * active status and inherits all registered user capabilities while
   * enabling enhanced community management features.
   *
   * All moderator creation requires validation of community appointment
   * authority, verification of assigned communities list, and confirmation of
   * moderation permissions scope. This ensures only qualified individuals
   * receive community management privileges.
   *
   * For self-registration, the DTO includes session context fields required
   * for audit trail and security monitoring of moderator authentication
   * activities.
   */
  export type ICreate = {
    /**
     * Reference to the existing registered user account that this moderator
     * will be based on. The moderator inherits all user capabilities and
     * profile information from this base account.
     */
    registered_user_id: string & tags.Format<"uuid">;

    /**
     * JSON field containing specific moderation capabilities and community
     * access levels that this moderator will have. Defines the scope of
     * moderation actions available including content management and user
     * oversight privileges. Stored as JSON string in database.
     */
    moderation_permissions: string;

    /**
     * JSON array of community IDs where this moderator will have active
     * moderation privileges. Only communities in this list can be managed
     * after appointment. Stored as JSON string in database.
     */
    assigned_communities: string;

    /**
     * Identifier of the user or system who is appointing this moderator.
     * Used for authority tracking and establishing appointment lineage for
     * accountability.
     */
    appointed_by: string;

    /**
     * Total moderation actions performed for performance tracking and
     * accountability. Initial value is 0 for new moderator appointments.
     */
    moderation_count: number & tags.Type<"int32">;

    /**
     * Timestamp of most recent moderation activity for engagement tracking.
     * Initial value set to appointment timestamp.
     */
    last_moderation_action: string & tags.Format<"date-time">;

    /**
     * Moderator status: active, inactive, suspended, or resigned. Initial
     * value set to 'active' upon appointment.
     */
    active_status: string;

    /**
     * Moderator appointment timestamp for authority tracking and
     * accountability.
     */
    appointed_at: string & tags.Format<"date-time">;

    /**
     * Moderator's IP address for enhanced security monitoring and access
     * control during self-registration. Required for audit trail and
     * security monitoring of moderator account creation.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Connection URL showing where the moderator registered from for
     * security analytics and monitoring. Required for tracking the source
     * of moderator registration activity.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating how the moderator accessed the registration
     * interface for security tracking. Required for complete audit trail of
     * moderator account creation.
     */
    referrer: string & tags.Format<"uri">;

    /** Record creation timestamp for audit trails and moderation history. */
    created_at: string & tags.Format<"date-time">;

    /** Last update timestamp for change tracking and permission updates. */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Summary representation of community moderators for references and
   * lightweight displays.
   *
   * Provides essential moderator information including identification,
   * community associations, and moderation authority context. This summary
   * includes key moderation metadata while excluding detailed activity
   * history for performance optimization.
   *
   * Community moderators are trusted members who help maintain community
   * standards and facilitate discussions within their assigned communities.
   * They inherit all registered user capabilities plus enhanced community
   * management tools including content moderation (post and comment removal),
   * user management (warnings and temporary bans), community rule
   * enforcement, and post pinning capabilities.
   *
   * Moderators maintain community health, enforce guidelines, and help
   * resolve conflicts while building positive community environments. They
   * serve as bridges between community members and platform administrators,
   * providing localized governance while maintaining platform-wide standards
   * and policies.
   *
   * Used in moderation action references, session management contexts, and
   * community oversight displays where moderator identification and authority
   * verification is needed without full profile details. Optimized for
   * accountability and audit trail purposes while maintaining appropriate
   * privacy boundaries.
   *
   * The summary includes moderation-specific tracking fields such as
   * appointment authority, current status, and activity metrics for
   * transparency and performance monitoring.
   */
  export type ISummary = {
    /**
     * Unique identifier of the community moderator record. Primary key for
     * moderator account identification and reference tracking.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reference to base registered user account for authentication and
     * profile information. Links the moderator role to the underlying user
     * account that provides authentication credentials and basic profile
     * data.
     */
    reddit_platform_registereduser_id: string & tags.Format<"uuid">;

    /**
     * Registered user account associated with this moderator role.
     * Reference to the underlying user account providing authentication
     * capabilities and basic user context.
     */
    user?: IRedditPlatformRegisteredUser.ISummary | undefined;

    /**
     * JSON field containing specific moderation capabilities and community
     * access levels. Defines the scope of moderation actions available
     * including content management (post/comment removal), user oversight
     * (warnings/bans), rule enforcement, and administrative privileges.
     */
    moderation_permissions: {
      /**
       * Permission to remove posts from communities for content
       * moderation purposes.
       */
      can_remove_posts: boolean;

      /**
       * Permission to remove comments for inappropriate content
       * moderation.
       */
      can_remove_comments: boolean;

      /** Permission to ban users from communities for rule violations. */
      can_ban_users: boolean;

      /** Permission to issue warnings to users for minor rule violations. */
      can_warn_users: boolean;

      /** Permission to pin important posts to community top positions. */
      can_pin_posts: boolean;

      /** Permission to edit and maintain community rules and guidelines. */
      can_edit_rules: boolean;

      /** Permission to appoint and remove other community moderators. */
      can_manage_moderators: boolean;

      /**
       * Permission to approve posts that have been automatically
       * filtered.
       */
      can_approve_posts: boolean;
    };

    /**
     * JSON array of community IDs where user has moderation privileges.
     * Lists all communities where this moderator is authorized to perform
     * management actions and enforce community standards.
     */
    assigned_communities: string;

    /**
     * Total moderation actions performed for performance tracking and
     * accountability. Tracks the cumulative number of moderation activities
     * for effectiveness measurement and community oversight.
     */
    moderation_count: number & tags.Type<"int32">;

    /**
     * Timestamp of most recent moderation activity for engagement tracking.
     * Records when the moderator last performed any moderation action for
     * activity monitoring and performance analysis.
     */
    last_moderation_action?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Quality score based on moderation effectiveness and community
     * satisfaction. Numerical rating reflecting the quality and impact of
     * moderation actions within assigned communities.
     */
    moderation_score?: (number & tags.Type<"int32">) | undefined;

    /**
     * Identifier of user or system who appointed this moderator. Records
     * the authority that granted moderation privileges for accountability
     * and appointment lineage tracking.
     */
    appointed_by: string;

    /**
     * Moderator appointment timestamp for authority tracking and
     * accountability. Records when the moderator role was initially
     * assigned for audit trails and tenure calculation.
     */
    appointed_at: string & tags.Format<"date-time">;

    /**
     * Moderator status indicating current operational state: active (fully
     * authorized), inactive (temporarily disabled), suspended (temporary
     * restriction), or resigned (voluntarily ended role). Controls access
     * to moderation tools and community management capabilities.
     */
    active_status: "active" | "inactive" | "suspended" | "resigned";

    /**
     * Record creation timestamp for audit trails and moderation history.
     * Timestamp when the moderator record was initially created in the
     * system for compliance and historical tracking.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last update timestamp for change tracking and permission updates.
     * Records when any moderator profile information or permissions were
     * last modified for audit trail maintenance.
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Community moderator authentication response with access tokens and
   * comprehensive moderator profile information.
   *
   * Returned after successful moderator login, registration, or token
   * refresh, containing authentication credentials and detailed moderator
   * account context. Provides the necessary tokens and information for access
   * to moderation tools and community management capabilities.
   *
   * This response includes access tokens for API authentication, refresh
   * tokens for session renewal, and complete moderator profile information
   * including assigned communities, current permissions, activity metrics,
   * and appointment authority details. The response structure ensures
   * moderators have immediate access to all necessary context for community
   * management activities.
   *
   * Moderator authentication incorporates additional security checks beyond
   * standard user validation, including verification of active moderation
   * status, confirmation of assigned communities access, and validation of
   * moderation permissions integrity. This ensures moderators can only access
   * communities and tools where they have appropriate authority.
   *
   * The authorized response maintains the connection between the base
   * registered user account and the moderation-specific profile, ensuring
   * proper inheritance of standard user capabilities while enabling enhanced
   * community management features. Essential for immediate access to
   * moderation dashboard, content management tools, and community oversight
   * capabilities.
   */
  export type IAuthorized = {
    /**
     * Complete summary information about the authenticated moderator
     * including user context, community associations, moderation
     * permissions, activity metrics, and appointment authority. Provides
     * comprehensive moderator profile for UI display and permission
     * management.
     */
    moderator: IRedditPlatformCommunityModerator.ISummary;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Request body for community moderator authentication to validate
   * credentials and establish authenticated sessions with appropriate
   * permission levels.
   *
   * This DTO enables appointed community moderators to authenticate using
   * their registered user credentials while receiving moderator-specific
   * access tokens and session management. The login process validates
   * authentication credentials and generates tokens with moderator privilege
   * context for community management activities.
   *
   * Authentication incorporates moderator-specific checks beyond standard
   * user validation, including verification of active moderation status,
   * confirmation of assigned communities access, and validation of moderation
   * permissions integrity. This ensures moderators can only access
   * communities where they have appointed authority.
   *
   * Session context fields are required for creating authenticated session
   * records in the database with proper connection metadata for security
   * monitoring, audit trails, and compliance requirements. These fields
   * provide essential tracking information for session management and
   * security analysis.
   *
   * Successful authentication through this endpoint generates both access
   * tokens and refresh tokens specifically designed for moderator workflow
   * requirements including content moderation, user management, and community
   * oversight activities.
   */
  export type ILogin = {
    /**
     * Moderator's unique username or email address for authentication. Must
     * match the credentials of an existing registered user account with
     * active moderator privileges.
     */
    username: string;

    /**
     * Moderator's password for authentication validation. Will be securely
     * hashed and compared against stored password hash for account
     * verification.
     */
    password: string & tags.Format<"password">;

    /**
     * Connection URL showing where user accessed the platform from.
     * Required session context field for creating authenticated session
     * records with proper connection metadata.
     */
    href: string;

    /**
     * Referrer URL indicating how user arrived at the platform. Required
     * session context field for traffic analysis and session tracking.
     */
    referrer: string;

    /**
     * User's IP address at session creation for security monitoring and
     * geographic analytics. Optional field - server can extract from
     * request, but client may provide for SSR scenarios.
     */
    ip?: string | null | undefined;
  };

  /**
   * Community moderator token refresh request for extending authentication
   * sessions.
   *
   * Used by community moderators to refresh expired access tokens using valid
   * refresh tokens without re-authentication. This enables continuous access
   * to moderation tools and community management capabilities.
   *
   * The refresh process validates the provided refresh token, verifies
   * moderator account status, and ensures moderation permissions remain
   * valid. Required for maintaining seamless moderator workflows during
   * extended community management activities.
   */
  export type IRefresh = {
    /**
     * Valid refresh token issued during previous community moderator login
     * or registration. Used to obtain new access tokens without requiring
     * re-authentication.
     */
    refresh_token: string;
  };
}
