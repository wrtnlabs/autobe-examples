import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { IRedditCommunityCommunity } from "./IRedditCommunityCommunity";

export namespace IRedditCommunityCommunityModerator {
  /**
   * Request body for creating a new community moderator account during
   * registration. This DTO represents the minimal user-provided information
   * required to establish a community moderator identity, excluding
   * system-managed fields that are automatically generated.
   *
   * Community moderators are elevated users with administrative privileges
   * within their assigned communities. Registration requires unique email
   * verification and secure password establishment to ensure proper
   * authentication controls for moderation responsibilities.
   *
   * This DTO enables registration by collecting essential authentication
   * credentials while delegating profile management, role assignment, and
   * community association to subsequent administrative workflows. The design
   * separates immediate security requirements from extended permission
   * configurations.
   *
   * Used during initial community moderator onboarding where email serves as
   * primary identifier and password establishes secure authentication
   * foundation. Additional moderator characteristics, community assignments,
   * and permission levels are configured through separate administrative
   * processes.
   */
  export type ICreate = {
    /**
     * Unique email address serving as primary authentication identifier for
     * the community moderator. This email must be verified during
     * registration and serves dual purposes: user authentication credential
     * and official communication channel for moderation activities.
     *
     * Email uniqueness is enforced across the platform to prevent duplicate
     * moderator accounts. The address receives critical notifications
     * including moderation alerts, community reports, policy updates, and
     * administrative communications related to community governance
     * responsibilities.
     *
     * Validated against RFC 5322 email format standards. Must belong to
     * active, accessible email account capable of receiving time-sensitive
     * moderation notifications and platform administrative communications.
     * Restricted from using disposable or temporary email services for
     * security and accountability reasons.
     */
    email: string & tags.Format<"email">;

    /**
     * Connection URL (current page URL) - essential connection metadata for
     * session creation and audit tracking. This field captures the exact
     * URL where the authentication request originated, enabling
     * comprehensive session logging and security monitoring.
     *
     * The href provides critical context for authentication audits,
     * security incident investigation, and compliance reporting. It enables
     * tracking of authentication patterns, geographic analysis, and
     * security threat detection across the platform.
     *
     * Must be a valid absolute URL including protocol, domain, and path
     * components. Captures the complete browsing context where users
     * initiated their authentication request, supporting both single-page
     * applications and traditional server-rendered pages.
     *
     * This connection metadata is required for session creation in the
     * community moderator sessions table and audit compliance. Server uses
     * this information to populate session records with accurate connection
     * origins.
     */
    href: string & tags.Format<"uri">;

    /**
     * Client IP address for authentication session tracking and security
     * monitoring. Optional field that can be provided by client
     * applications, particularly useful for server-side rendering scenarios
     * where IP extraction may be complex or unreliable.
     *
     * When provided, must be a valid IPv4 or IPv6 address format.
     * Automatically populated server-side from request metadata when not
     * provided by clients. Used for comprehensive authentication auditing,
     * geographic analysis, security threat detection, and compliance
     * reporting.
     *
     * IP tracking enhances platform security by enabling anomaly detection,
     * suspicious activity flagging, and geographic restriction enforcement.
     * Supports both IPv4 (192.168.1.1) and IPv6 (2001:db8::1) address
     * formats for complete network compatibility.
     *
     * Optional designation allows flexibility for various client
     * implementations while ensuring comprehensive audit tracking through
     * server-side IP extraction when client-side provision is not feasible
     * or necessary.
     */
    ip?:
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined;

    /**
     * Unique display name for the community moderator across platform
     * interfaces and community interactions. This nickname serves as the
     * public-facing identifier visible to community members, co-moderators,
     * and administrators during moderation activities.
     *
     * Nickname uniqueness is enforced platform-wide to prevent confusion
     * and ensure clear identification. Displayed throughout community
     * moderation interfaces, content management tools, and member-facing
     * moderation notifications. Must comply with community standards and
     * avoid impersonation, offensive content, or trademark violations.
     *
     * Used for attribution in moderation actions, community rule
     * enforcement, and administrative communications. Should reflect
     * professional conduct appropriate for community governance
     * responsibilities while maintaining personal identity expression
     * within acceptable boundaries.
     *
     * Moderator nicknames carry authority implications within communities
     * and should inspire trust among members. Platform reserves rights to
     * request nickname changes for violations of community standards,
     * impersonation concerns, or administrative requirements.
     */
    nickname: string;

    /**
     * Plain text password for moderator account authentication - will be
     * securely hashed using bcrypt algorithm before database storage. Must
     * not be pre-hashed or encoded by client applications to ensure proper
     * security processing.
     *
     * Password complexity requirements enforced during validation: minimum
     * length (typically 8+ characters), character variety (uppercase,
     * lowercase, numbers, symbols), and absence from common password
     * databases. Password strength directly impacts moderation security
     * given elevated community management privileges.
     *
     * Client-side password validation should encourage strong security
     * practices while avoiding exposure of specific validation rules to
     * potential attackers. Password is transmitted securely over HTTPS and
     * immediately hashed server-side using industry-standard cryptographic
     * methods.
     *
     * Moderator passwords require heightened security due to community
     * management responsibilities. Compromised moderator accounts could
     * enable unauthorized content removal, member management, or community
     * policy enforcement actions.
     */
    password: string;

    /**
     * Referrer URL (previous page URL) - essential connection metadata for
     * comprehensive authentication tracking and behavioral analysis. This
     * field captures the browsing history that led users to the
     * authentication interface, enabling detailed audit trails and user
     * journey mapping.
     *
     * The referrer provides critical context for security investigations,
     * usage pattern analysis, and conversion funnel optimization. It
     * enables tracking of authentication sources, referral analysis, and
     * comprehensive user behavior understanding across the platform
     * ecosystem.
     *
     * Must be a valid absolute or relative URL representing the previous
     * page location. Supports empty string values for direct access
     * scenarios where no referrer exists. Enables comprehensive session
     * logging with complete navigation context for audit compliance and
     * security monitoring.
     *
     * This connection metadata is required for session creation in
     * community moderator sessions table and supports advanced analytics
     * including traffic source analysis, conversion rate optimization, and
     * comprehensive authentication event correlation across the Reddit
     * Community platform.
     */
    referrer: string;
  };

  /**
   * Authorization response for community moderator authentication operations
   * containing the complete authenticated moderator profile with safe,
   * client-appropriate data and JWT tokens.
   *
   * This response type provides comprehensive community moderator identity
   * information including all essential profile fields, authentication
   * timestamps, and JWT authorization tokens. The schema represents the
   * authenticated state of community moderators with complete identity
   * context needed for client applications to display profile information and
   * maintain authenticated sessions.
   *
   * Community moderators are community-level administrators with elevated
   * privileges for managing specific communities. This authorization response
   * includes all publicly accessible profile data plus authentication tokens
   * required for secured API communications.
   *
   * The response structure supports immediate profile display, session
   * management, and authenticated API interactions through the included JWT
   * token bundle. All timestamp fields follow ISO 8601 date-time format for
   * consistent client-side processing.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated community moderator. Generated
     * automatically using UUID v4 for secure, non-sequential identification
     * across the platform.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique display name for the community moderator serving as their
     * public identifier within communities. Must be unique across all
     * community moderator accounts and cannot be changed after account
     * creation.
     */
    nickname: string;

    /**
     * Verified email address for moderator communications and
     * authentication. Serves as the primary username for login and enables
     * email-based account recovery and moderation notifications.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when the community moderator account was created. Records
     * the initial registration date and time following ISO 8601 format for
     * consistent platform-wide audit tracking.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the community moderator account profile was last
     * updated. Tracks changes to moderator profile information and follows
     * ISO 8601 date-time format for audit compliance.
     */
    updated_at: string & tags.Format<"date-time">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Request body for community moderator login authentication. Contains the
   * essential credentials required for authentication plus session context
   * fields needed for session creation and audit tracking.
   *
   * Community moderators authenticate using their email address as username
   * combined with password verification. The system validates credentials
   * against stored password hashes and creates new session records upon
   * successful authentication.
   *
   * Session context fields (ip, href, referrer) are required for self-login
   * operations to populate the community_moderator_sessions table with
   * connection metadata needed for security monitoring and audit compliance.
   */
  export type ILogin = {
    /**
     * Email address (acts as username) for the community moderator
     * authentication. Must match a registered community moderator email
     * address.
     */
    email: string & tags.Format<"email">;

    /**
     * The moderator's plaintext password for secure authentication. Will be
     * verified against the stored password hash before authentication is
     * granted.
     */
    password: string;

    /**
     * Client IP address for session tracking and security monitoring.
     * Server can extract from request headers, but client may provide for
     * SSR scenarios. Optional field that enhances audit trail accuracy.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) providing session context for audit
     * trails. Required for session creation to track the entry point of
     * authenticated sessions.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) providing navigation context for
     * session tracking. Required for complete session audit records and
     * security analysis.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Enhanced community moderator summary providing complete context for
   * moderation workflows including community association, role details, and
   * assignment tracking. This comprehensive representation supports efficient
   * moderation queue management and assignment coordination.
   */
  export type ISummary = {
    /**
     * Primary key identifying the community moderator. Provides immutable
     * identification across all community operations and maintains
     * referential integrity throughout the platform architecture.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reddit community moderator identifier extracted from authenticated
     * JWT context. Ensures proper actor identification and enables
     * authorization checks within moderation workflows. This field
     * represents the authenticated user performing the moderation actions.
     */
    reddit_community_moderator_id: string & tags.Format<"uuid">;

    /**
     * Display name used for moderator attribution and accountability. Shows
     * who performed or is assigned to specific moderation actions for
     * transparency. Maps directly to the nickname field in
     * reddit_community_community_moderators table.
     */
    nickname: string;

    /**
     * Community context showing which community this moderator administers.
     * Essential for queue filtering, assignment coordination, and
     * multi-community platform operations. Links moderator to their scope
     * of authority.
     */
    community: IRedditCommunityCommunity.ISummary;

    /**
     * Moderator role level indicating permissions scope: owner, moderator,
     * or assistant. Determines administrative authority, community
     * management capabilities, and platform access levels within the
     * moderation hierarchy.
     */
    role: string;

    /**
     * Count of active moderation queue entries currently assigned to this
     * moderator. Provides workload visibility for assignment coordination
     * and capacity planning within moderation teams.
     */
    moderation_count?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /**
     * Active status indicating whether this moderator can currently perform
     * moderation actions. Used for availability tracking, assignment
     * eligibility, and platform-wide moderator management.
     */
    is_active: boolean;
  };
}
