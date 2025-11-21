import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallGuest {
  /**
   * Guest session creation request for establishing anonymous browsing
   * sessions within the shopping mall marketplace platform.
   *
   * This DTO enables unauthenticated visitors to create temporary guest
   * accounts that provide basic marketplace access without requiring personal
   * information submission or permanent account creation. Guest sessions
   * facilitate anonymous product browsing, shopping cart management, and
   * activity tracking while maintaining user privacy and session continuity
   * across page visits.
   *
   * The request captures essential session metadata including IP address for
   * security monitoring, connection URLs for session context, and referrer
   * information for traffic source analysis. This anonymous tracking supports
   * personalized experiences, browser compatibility detection, and marketing
   * attribution while preserving guest anonymity and complying with privacy
   * requirements.
   *
   * Guest accounts automatically expire through systematic cleanup processes,
   * ensuring platform performance and data hygiene while providing immediate
   * marketplace access for product discovery and conversion opportunities.
   * This foundation enables seamless transition from anonymous browsing to
   * registered customer accounts when users choose to complete purchases or
   * access enhanced features.
   */
  export type ICreate = {
    /**
     * IP address of guest browsing device for session identification and
     * traffic analysis. Optional field allowing client provision for SSR
     * scenarios with proper IPv4 format validation supporting server-side
     * session establishment and geographic analysis.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Connection URL for guest session tracking and website interaction
     * monitoring. Required field establishing session context and
     * navigation path tracking for comprehensive guest activity analysis
     * and session correlation.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL for guest traffic source analysis and marketing
     * attribution. Required field for understanding guest navigation
     * patterns, traffic source tracking, and campaign effectiveness
     * measurement across marketing channels.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Anonymous session identifier for guest tracking and browsing activity
     * correlation. Automatically generated unique identifier maintaining
     * session continuity and anonymous user recognition across platform
     * interactions.
     */
    session_id: string & tags.MinLength<10> & tags.MaxLength<64>;

    /**
     * Browser user agent string for device and browser tracking across
     * sessions. Captures client device characteristics, browser
     * capabilities, and platform compatibility information for optimized
     * user experience delivery.
     */
    user_agent: string;

    /**
     * Timestamp of last recorded activity for session expiration and
     * cleanup management. ISO 8601 date-time format enabling session
     * timeout calculation and automated cleanup of inactive guest
     * sessions.
     */
    last_activity_at: string & tags.Format<"date-time">;

    /**
     * Guest session creation timestamp for analytics tracking and visitor
     * periodization. ISO 8601 date-time format providing chronological
     * session ordering and retention analysis capabilities.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last guest session update timestamp for activity tracking and session
     * continuity. Tracks session modifications, activity recordings, and
     * maintenance operations for comprehensive session lifecycle
     * management.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Guest session termination timestamp for privacy compliance and data
     * cleanup operations. Soft deletion indicator maintaining audit trails
     * while enabling automated data retention and privacy regulation
     * compliance.
     */
    deleted_at?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Guest authentication response containing authenticated session tokens and
   * updated access credentials for continued anonymous browsing within
   * shopping mall marketplace platform.
   *
   * Represents successful establishment of secure temporary access enabling
   * unauthenticated visitors to perform limited platform interactions
   * including product browsing, shopping cart management, session persistence
   * across multiple visits without requiring personal information submission
   * or permanent account creation.
   *
   * Facilitates conversion funnel optimization by maintaining guest
   * engagement through secure session management while providing clear
   * pathway to customer registration when visitors choose to create personal
   * accounts for enhanced marketplace capabilities and personalized
   * experiences.
   */
  export type IAuthorized = {
    /**
     * Primary UUID identifier for guest session tracking and system
     * correlation across the shopping mall platform.
     *
     * Automatically generated using UUID v4 algorithm for universally
     * unique identification and traceability of anonymous browsing
     * sessions.
     *
     * References the primary key from shopping_mall_guest database table
     * for consistency across platform operations and analytics tracking.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Anonymous session identifier used for guest tracking and activity
     * correlation across browsing sessions.
     *
     * Serves as unique temporal reference for connecting user interactions,
     * page visits, shopping cart activities, and conversion funnel analysis
     * throughout the guest browsing experience.
     *
     * Employed by analytics systems for traffic pattern analysis, session
     * continuity maintenance, and debugging of anonymous user behaviors
     * without personal identification requirements.
     */
    session_id: string & tags.MinLength<10> & tags.MaxLength<64>;

    /**
     * Device IP address for guest location analysis, security monitoring,
     * and traffic source identification.
     *
     * Used for geographic positioning, traffic pattern analysis, potential
     * fraud detection, security logging, and marketing attribution
     * purposes.
     *
     * Supports both IPv4 and IPv6 formats enabling comprehensive network
     * identification and compliance with various deployment environments
     * and network configurations.
     */
    ip_address: string & tags.Format<"ipv4">;

    /**
     * Browser user agent string for device fingerprinting, session
     * persistence, and compatibility testing.
     *
     * Enables platform to identify device types, browser capabilities,
     * operating system information, and version compatibility for optimal
     * user experience delivery.
     *
     * Critical for session continuity across different devices,
     * troubleshooting browser-specific issues, and maintaining security
     * context across anonymous browsing sessions.
     */
    user_agent: string;

    /**
     * Timestamp of last recorded activity for session expiration
     * management, cleanup scheduling, and activity tracking.
     *
     * Triggers session timeout calculations, data cleanup operations, and
     * conversion timing analysis throughout the anonymous browsing
     * lifecycle.
     *
     * Supports automated guest session management through background
     * cleanup processes and provides analytics baselines for understanding
     * guest engagement patterns and conversion timing metrics.
     */
    last_activity_at: string & tags.Format<"date-time">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Guest session refresh request containing validated session credentials
   * for access token renewal within shopping mall marketplace platform.
   *
   * Enables continuation of anonymous browsing experiences through secure
   * authentication token updates while maintaining visitor privacy and
   * session continuity without requiring registration or personal information
   * disclosure.
   *
   * Supports platform security through controlled token lifecycle management,
   * preventing session hijacking while maintaining usability for temporary
   * visitors and supporting natural conversion flows from anonymous browsing
   * to customer account creation through clearly integrated user journey
   * pathways.
   */
  export type IRefresh = {
    /**
     * Current guest session identifier for token renewal and session
     * extension operations.
     *
     * Required to verify the existing guest session before issuing
     * refreshed authentication tokens, ensuring security continuity and
     * preventing unauthorized access token generation.
     *
     * Used for validation of guest session persistence requirements,
     * activity tracking correlation, and seamless anonymous browsing
     * experience maintenance throughout longer engagement periods with
     * platform interactive features and shopping functionalities.
     */
    session_id: string & tags.MinLength<1>;
  };

  /**
   * Guest visitor summary for anonymous marketplace browsing session
   * management and activity tracking.
   *
   * Represents essential guest identification data for order processing and
   * marketplace analytics while protecting guest privacy. Guest summaries
   * enable marketplace operations to support anonymous customers for product
   * browsing, cart management, and basic transaction support without
   * requiring personal information submission.
   *
   * The summary format balances operational needs with privacy
   * considerations, exposing only critical fields needed for session
   * continuity and transaction processing. Guest tracking enables conversion
   * analysis and session management while maintaining visitor anonymity
   * through time-limited sessions.
   */
  export type ISummary = {
    /**
     * Primary Key. Unique identifier for guest session generated
     * automatically.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Anonymous session identifier for guest tracking and correlation.
     * Mandatory for active session management.
     */
    session_id: string;

    /**
     * IP address for location analysis and security tracking. Essential for
     * analytics and anomaly detection.
     */
    ip_address: string;

    /**
     * Guest session creation timestamp for visitor tracking and analytics
     * periodization.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
