import { tags } from "typia";

import { IVisitorConnectionContext } from "./IVisitorConnectionContext";
import { IAuthorizationToken } from "./IAuthorizationToken";
import { IVisitorSessionContext } from "./IVisitorSessionContext";

export namespace IRedditCommunityVisitor {
  /**
   * Visitor registration data for creating temporary guest accounts with
   * immediate platform access capabilities.
   *
   * This schema represents the essential information required to establish a
   * visitor account that enables basic platform browsing and personalized
   * experiences. The visitor system provides a lightweight onboarding pathway
   * before users commit to full member registration, reducing friction while
   * maintaining platform security standards.
   *
   * Registration creates both the visitor account record and an associated
   * active session for immediate platform access upon successful validation.
   * All fields are validated for proper format compliance according to
   * platform standards, and email/nickname uniqueness is enforced system-wide
   * to prevent identity conflicts between visitor accounts.
   *
   * The visitor account maintains comprehensive audit trails through session
   * metadata and connection tracking, enabling security monitoring,
   * conversion analytics, and detailed visitor behavior analysis throughout
   * the platform engagement lifecycle.
   */
  export type ICreate = {
    /**
     * Display name for the visitor account. Must be unique across all
     * visitor accounts and will serve as the primary identifier for this
     * visitor throughout community interactions and content attribution.
     */
    nickname: string & tags.MinLength<1> & tags.MaxLength<255>;

    /**
     * Email address for the visitor account. Required for potential account
     * upgrade notifications and communication. Must be a valid email format
     * with enforced uniqueness across all visitor accounts on the
     * platform.
     */
    email: string & tags.Format<"email">;

    /**
     * Password for the visitor account. Will be securely hashed using
     * bcrypt before database storage.
     *
     * Security note: This plain-text password is never stored directly in
     * the database. It is processed through a strong, industry-standard
     * hashing algorithm to ensure visitor account security during
     * registration and authentication operations.
     */
    password: string & tags.MinLength<8>;

    /**
     * Client IP address for session security tracking and audit purposes.
     * Optional field enabling enhanced security monitoring and geographical
     * session analytics for visitor accounts.
     */
    ip?: string | null | undefined;

    /**
     * Current page URL for navigation tracking and session context
     * establishment. Required field that captures the connection endpoint
     * for session continuity and comprehensive visitor journey analytics.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL for traffic source analysis and session context.
     * Required field providing complete navigation history that enables
     * traffic attribution and visitor acquisition analysis for platform
     * optimization.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Browser user agent string for client identification and compatibility
     * purposes. Optional field providing device and browser context
     * essential for session security validation and visitor experience
     * optimization across different platforms.
     */
    userAgent?: string | null | undefined;
  };

  /**
   * Visitor token refresh request enabling extended guest browsing sessions
   * with comprehensive security monitoring and behavioral tracking.
   *
   * This DTO captures the complete session connection context required for
   * secure visitor token rotation operations. The request enables visitors to
   * extend their platform access duration without re-authentication
   * interruptions while maintaining robust security through comprehensive
   * session tracking and monitoring capabilities.
   *
   * The operation supports visitor anonymity preservation across extended
   * browsing sessions while enabling security pattern detection, behavioral
   * analysis creation, and comprehensive audit trail maintenance for platform
   * security compliance. Connection metadata provides essential visitor
   * behavior context for community engagement analysis and personalized
   * experience optimization throughout the visitor's platform journey.
   *
   * Token refresh maintains visitor browsing continuity for community
   * exploration and content engagement while implementing proper security
   * measures through comprehensive session lifecycle management and
   * connection traffic analysis for platform protection.
   */
  export type IRefresh = {
    /**
     * Comprehensive connection context for visitor token refresh operations
     * including navigation tracking, security monitoring, and session
     * continuity mechanisms.
     *
     * This connection metadata enables secure token rotation while
     * maintaining visitor anonymity and browsing session continuity across
     * the Reddit Community platform. The context supports behavioral
     * analysis, security pattern detection, and comprehensive audit trails
     * without compromising visitor privacy.
     *
     * Connection tracking ensures seamless browsing experiences during
     * extended visitor sessions while providing essential security
     * monitoring for unauthorized access detection and session lifecycle
     * management across multiple page transitions and navigation flows.
     */
    connection: IVisitorConnectionContext;
  };

  /**
   * Complete visitor authorization response providing authenticated access to
   * Reddit Community platform features.
   *
   * This response encapsulates the full authentication context required for
   * visitor operations, including visitor identity summary, authentication
   * credentials, and comprehensive session tracking metadata. The structure
   * ensures secure, auditable visitor access while maintaining the
   * actor-entity relationship boundaries essential for platform security.
   *
   * The response enables authenticated visitor browsing, community access,
   * and content interaction while providing comprehensive session management
   * and security monitoring capabilities throughout the visitor's platform
   * experience.
   */
  export type IAuthorized = {
    /**
     * Authenticated visitor account summary containing essential identity
     * information for Reddit Community platform access with complete
     * profile context and session metadata.
     */
    visitor: IRedditCommunityVisitor.ISummary;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Current visitor session context including tracking metadata,
     * connection details, and security information for comprehensive
     * session audit and behavioral analysis.
     */
    session: IVisitorSessionContext;
  };

  /**
   * Lightweight visitor account summary optimized for efficient identity
   * resolution and community context display throughout the Reddit Community
   * platform.
   *
   * This summary provides essential visitor identification information while
   * maintaining performance optimization for list views, community browsing,
   * and content attribution contexts. The structure balances detail
   * completeness with query efficiency supporting scalable visitor management
   * across the platform's community ecosystem.
   */
  export type ISummary = {
    /**
     * Visitor account unique identifier serving as primary key for
     * authorization and access control across visitor-specific operations
     * throughout the Reddit Community platform.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public display name for visitor account serving as identifier in
     * community interactions. Must be unique across all visitor accounts
     * providing consistent identity for community engagement and content
     * attribution.
     */
    nickname: string;

    /**
     * Account creation timestamp indicating visitor registration time.
     * Provides account age context for community maturity assessment and
     * supports visitor-to-member upgrade workflow planning.
     */
    joinedAt: string & tags.Format<"date-time">;
  };
}
