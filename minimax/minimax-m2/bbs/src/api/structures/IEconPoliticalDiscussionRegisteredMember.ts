import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconPoliticalDiscussionRegisteredMember {
  /**
   * User registration request data for economic and political discussion
   * board participants.
   *
   * Contains the essential information required to create a new user account
   * in the economic and political discussion platform. This operation
   * establishes user identity and profile information for community
   * participation including article creation and discussion engagement.
   *
   * The registration process validates email uniqueness and establishes
   * initial account status as active. Users provide their display name for
   * community identification and can optionally include biography information
   * to share context about their interests or expertise in economic and
   * political topics.
   *
   * Upon successful registration, the system creates temporal tracking
   * entries and sets initial account status. This endpoint supports the
   * discussion board's foundational user identity system required for content
   * creation and community participation.
   *
   * Required fields include display name and email for user identification.
   */
  export type ICreate = {
    /**
     * User's display name for article authorship and community
     * identification.
     */
    display_name: string & tags.MinLength<1>;

    /** User email address for account management and notifications. */
    email: string & tags.MinLength<1> & tags.Format<"email">;

    /**
     * Optional user biography describing interests or background in
     * economics/politics.
     */
    bio?: string | undefined;

    /** Optional profile picture URL for user identification in discussions. */
    avatar_url?: (string & tags.Format<"uri">) | undefined;

    /** User account status indicating the current account state. */
    status: string;
  };

  /**
   * Authenticated user session response with access tokens and user profile
   * information.
   *
   * Returned upon successful authentication or token refresh, providing the
   * user with access tokens and essential profile information needed for
   * authenticated API interactions.
   *
   * Includes the user's unique identifier, access tokens for maintaining
   * session state across API requests, and comprehensive profile information
   * providing essential context for user identification and community
   * participation.
   *
   * This response enables authenticated users to access member-only features
   * including article creation, attachment uploads, profile management, and
   * community engagement in the economic and political discussion board.
   *
   * The response includes temporal tracking information for account lifecycle
   * management and supports soft deletion functionality for deactivated
   * accounts.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated registered member */
    id: string & tags.Format<"uuid">;

    /**
     * User's display name for article authorship and community
     * identification.
     */
    display_name: string;

    /** User email address for account management and notifications. */
    email: string & tags.Format<"email">;

    /**
     * Optional user biography describing interests or background in
     * economics/politics.
     */
    bio?: string | undefined;

    /** Optional profile picture URL for user identification in discussions. */
    avatar_url?: (string & tags.Format<"uri">) | undefined;

    /** User account status indicating the current account state. */
    status: string;

    /** When this user account was originally created. */
    created_at: string & tags.Format<"date-time">;

    /** When this user profile was last updated. */
    updated_at: string & tags.Format<"date-time">;

    /** Soft delete timestamp for deactivated user accounts. */
    deleted_at?: string | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * User authentication credentials for registered members of the economic
   * and political discussion board.
   *
   * Used to establish authenticated sessions for registered discussion board
   * participants who have completed account registration and profile setup.
   * The system validates the provided email address against registered user
   * accounts in the econ_political_discussion_users table and verifies
   * account status to ensure the user is active and not suspended.
   *
   * This authentication endpoint serves as the primary entry point for
   * registered members to access member-only features including article
   * creation, attachment uploads, profile management, and community
   * participation. The login process maintains user session state through the
   * registered user identity established during account creation.
   *
   * Includes comprehensive session context fields for tracking connection
   * metadata, providing security auditing and session management for the
   * discussion board platform. The system uses these additional context
   * fields to maintain detailed audit trails, enhance security monitoring,
   * and provide context for session analytics.
   *
   * Authentication success enables full access to the discussion board's
   * community features, allowing users to create and publish economic and
   * political content, engage in community discussions, manage their
   * discussion profiles, and participate in the broader community ecosystem.
   */
  export type ILogin = {
    /**
     * Registered user email address for account authentication and session
     * establishment.
     *
     * The email address must correspond to an existing registered user
     * account in the econ_political_discussion_users table. The system
     * validates this email against the unique constraint to ensure account
     * authenticity and prevent duplicate registrations. Email validation
     * ensures proper account management and enables secure password
     * verification during the authentication process.
     *
     * This field is essential for establishing user identity and
     * maintaining secure access to the discussion board platform. The email
     * serves as the primary identifier for locating the user's account
     * record and retrieving associated profile information including
     * display name, bio, avatar, and account status.
     */
    email: string & tags.Format<"email">;

    /**
     * User password for account authentication. Plain text password for
     * verification against stored hash.
     *
     * The password is provided in plain text during login but is
     * immediately hashed and compared against the stored password hash in
     * the econ_political_discussion_users table. This ensures secure
     * password verification without storing or transmitting plain text
     * passwords.
     *
     * Password authentication is the primary security mechanism for account
     * access, working in conjunction with email verification to establish
     * authenticated sessions. Strong password requirements may be enforced
     * to maintain platform security standards.
     */
    password: string;

    /**
     * Client IP address for session tracking and security auditing.
     * Optional field - server can extract from connection if not provided.
     *
     * The IP address field enables the system to track the geographical and
     * network origin of login attempts for security analysis, fraud
     * prevention, and session monitoring. While optional since the server
     * can extract this information from the connection, providing it
     * explicitly allows for more detailed logging and security auditing.
     *
     * This field supports the platform's security infrastructure by
     * providing additional context for authentication events, enabling
     * administrators to identify suspicious login patterns and maintain
     * robust security monitoring across the discussion board community.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Connection URL (current page URL) for session context and security
     * tracking. Required field for session establishment.
     *
     * The current page URL provides context about where the login request
     * originated, supporting session analytics, user experience tracking,
     * and security monitoring. This information helps the system understand
     * user navigation patterns and provides context for authentication
     * events.
     *
     * The href field enables proper session establishment by maintaining
     * continuity with the user's current browser context. This is essential
     * for seamless user experience and proper session management across
     * different pages and features of the discussion board platform.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) for session context and security
     * tracking. Required field for session establishment.
     *
     * The referrer URL indicates the previous page the user visited before
     * attempting login, providing valuable context for understanding user
     * navigation paths and session flow. This information supports user
     * experience analytics and security monitoring by tracking how users
     * arrive at the authentication endpoint.
     *
     * This field is critical for maintaining proper session context and
     * enabling detailed logging of user journeys through the discussion
     * board platform. It helps identify the entry points that lead to user
     * registration and authentication events.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Token refresh request for maintaining authenticated sessions for
   * registered discussion board members.
   *
   * Used to renew user access tokens while maintaining their authenticated
   * session state in the economic and political discussion board without
   * requiring users to re-authenticate. The refresh operation validates the
   * provided refresh token against the user's active session and extends the
   * session lifetime accordingly.
   *
   * This endpoint is essential for maintaining seamless user experience by
   * extending session lifetimes without requiring repeated authentication,
   * while maintaining security through proper refresh token validation. The
   * operation preserves the user's profile status and community identity
   * established during the initial login process.
   *
   * The refresh mechanism ensures continuous session continuity for ongoing
   * discussion board participation, allowing authenticated users to continue
   * creating articles, uploading attachments, and engaging in economic and
   * political discussions without interruption. This supports long-term
   * engagement and reduces friction in the user experience.
   *
   * Token refresh operations are critical for maintaining the security and
   * usability of the discussion board platform, ensuring that users can
   * maintain their authenticated state throughout extended sessions while the
   * system maintains proper security controls and session management
   * protocols.
   */
  export type IRefresh = {
    /**
     * Valid refresh token for extending user session lifetime and
     * maintaining authenticated state.
     *
     * The refresh token is a secure token issued during the initial login
     * process that allows users to obtain new access tokens without
     * re-entering their credentials. This token must be valid and not
     * expired to successfully renew the user's authenticated session.
     *
     * Refresh token validation ensures that only legitimate users with
     * valid tokens can extend their sessions, maintaining the security
     * integrity of the discussion board platform. The system validates the
     * refresh token against the user's active session record before issuing
     * new access tokens.
     *
     * This mechanism enables seamless session management while maintaining
     * robust security controls. Users can continue participating in the
     * discussion board community, creating content, and accessing member
     * features without authentication interruption.
     */
    refresh_token: string;
  };
}
