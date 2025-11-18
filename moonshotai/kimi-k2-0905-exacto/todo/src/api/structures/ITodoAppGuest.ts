import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Guest registration request containing connection context for temporary
   * session creation with audit trail support
   *
   * Captures essential session metadata needed for guest tracking and
   * security monitoring while supporting seamless upgrade pathways to full
   * registered accounts through preserved session context that maintains user
   * experience continuity during account conversion workflows
   */
  export type ICreate = {
    /**
     * Client IP address for session tracking and security monitoring
     *
     * Optional field allowing client to provide IP address for Server-Side
     * Rendering scenarios while supporting security audit trails and
     * geographic analysis that inform business intelligence about guest
     * user distribution patterns worldwide
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;

    /**
     * Connection URL (current page URL) for session context and user
     * journey tracking
     *
     * Mandatory field capturing current page location when guest session is
     * created, enabling proper audit trails and conversion analytics that
     * support guest engagement analysis throughout the application
     * exploration workflow
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) for understanding user entry
     * pathways and marketing attribution
     *
     * Mandatory field providing insights into how guests arrive at the
     * application while supporting marketing effectiveness measurement and
     * user experience optimization through entry point analysis that
     * informs product strategy and customer journey improvement
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Guest authorization response schema providing temporary access tokens
   * with complete session metadata tracking as defined in Prisma
   * todo_app_guests model
   *
   * Includes all mandatory database fields with proper timestamp formatting
   * for guest session lifecycle management. The schema provides comprehensive
   * session data for continued temporary access while maintaining appropriate
   * security boundaries and audit trail capabilities
   *
   * Response structure supports seamless guest experience continuation with
   * full session context preservation for upgrade pathways and session
   * expiration enforcement
   */
  export type IAuthorized = {
    /**
     * Guest account unique identifier in UUID format referencing Prisma
     * primary key field
     */
    id: string & tags.Format<"uuid">;

    /**
     * Guest session tracking identifier per Prisma schema specification for
     * temporary access control
     */
    session_identifier: string;

    /** Guest session creation timestamp per Prisma schema datetime field */
    created_at: string & tags.Format<"date-time">;

    /**
     * Guest session last modification timestamp per Prisma schema datetime
     * field
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Guest session expiration timestamp per Prisma nullable datetime
     * configuration
     */
    expired_at?: (string & tags.Format<"date-time">) | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Guest token refresh request for extending temporary guest session
   * duration while maintaining security integrity and comprehensive session
   * tracking.
   *
   * Represents the credential refresh payload that enables continued
   * temporary access for guest users exploring application features without
   * full registration commitment. Contains connection context information
   * required for session renewal, security validation, and audit trail
   * maintenance during the refresh process.
   *
   * This request structure ensures guest sessions can be extended
   * appropriately while maintaining session boundaries, preventing indefinite
   * access, and supporting eventual transition to full registered accounts.
   * The operation balances security requirements with user experience by
   * allowing temporary session remediation while implementing strict time
   * limits and access controls.
   *
   * Usage across guest authentication flows supports temporary user
   * exploration, conversion optimization, and security protection through
   * session lifecycle management that enforces appropriate usage restrictions
   * while providing legitimate feature exploration opportunities.
   */
  export type IRefresh = {
    /**
     * Client IP address for session tracking and security monitoring.
     * Captures the requesting client's network location for audit trails,
     * geolocation filtering, and abuse detection.
     *
     * Supports both IPv4 and IPv6 format addresses. Optional field that can
     * be extracted from HTTP headers when not explicitly provided by the
     * client. Mandatory in certain contexts requiring enhanced security
     * validation or when server-side rendering obscures source IP
     * information.
     *
     * The address is used for security monitoring, session correlation,
     * geographic restriction enforcement, and compliance requirements
     * including location-based data handling regulations.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL or current page location when the guest session
     * refresh request was initiated. Essential for session tracking,
     * security monitoring, and location-aware authentication.
     *
     * Contains the complete URI including protocol, domain, path, and query
     * parameters representing the guest user's current application state at
     * the time of token refresh. Used to verify session continuity, detect
     * unauthorized geographic shifts, and maintain session context across
     * refresh cycles.
     *
     * This persistent location tracking enables legitimate refresh requests
     * while preventing session hijacking attempts that could occur if
     * requests originate from unexpected web locations or geographic
     * regions inconsistent with the established guest session profile.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating how the guest arrived at the application or
     * the source that motivated session refresh. Provides user flow
     * analysis, marketing attribution, and session origin verification for
     * comprehensive audit tracking and session management.
     *
     * Contains the complete URI of the referring page, document, or
     * resource that directed the guest user to initiate refresh traffic.
     * Supports marketing analytics, conversion tracking across different
     * traffic sources, and early detection of abuse patterns that might
     * indicate automated or illegitimate access attempts.
     *
     * The referrer enables session origin correlation, user journey
     * mapping, external source validation, and security monitoring to
     * distinguish between legitimate user activity and potential automated
     * session exploitation attempts during the guest token renewal
     * process.
     */
    referrer: string & tags.Format<"uri">;
  };
}
