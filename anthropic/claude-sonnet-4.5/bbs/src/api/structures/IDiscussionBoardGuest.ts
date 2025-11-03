import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /**
   * Registration request data for creating a new member account from guest
   * status.
   *
   * This DTO contains all information necessary for a guest user to register
   * as a member of the discussion board. Registration is the first step in
   * the user lifecycle, transitioning an unauthenticated guest into an
   * authenticated member with content creation privileges.
   *
   * The registration process creates a new member account in
   * pending_email_verification status. Upon successful account creation, the
   * system sends a verification email to the provided address and immediately
   * issues JWT tokens for authenticated access. However, certain member
   * privileges (posting articles and comments) require email verification
   * completion.
   *
   * This is a self-registration operation where the guest themselves are
   * creating their own account, so session context fields (ip, href,
   * referrer) are included to establish the initial session immediately upon
   * registration. The href and referrer fields are mandatory as they capture
   * the registration context, while ip is optional since the server can
   * extract it from the HTTP request.
   *
   * The system enforces strict validation rules including username uniqueness
   * (case-insensitive), email uniqueness (case-insensitive), username format
   * restrictions, and password strength requirements. Any validation failures
   * result in specific error messages guiding the user to correct their
   * input.
   */
  export type IRegistration = {
    /**
     * Unique username for member identification and login.
     *
     * Must be 3-30 characters long and contain only alphanumeric
     * characters, underscores, and hyphens. The username serves as a
     * permanent identifier for the user account and is used for login
     * authentication along with the email address.
     *
     * Usernames are case-insensitive for uniqueness validation, meaning
     * 'JohnDoe' and 'johndoe' are considered the same username. The system
     * enforces username uniqueness across all member accounts to prevent
     * conflicts.
     *
     * Reserved usernames (such as 'admin', 'moderator', 'system') are
     * prohibited to prevent impersonation of system roles.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">;

    /**
     * Email address for authentication, notifications, and account
     * recovery.
     *
     * Must be a valid email address following standard email format
     * specifications. The email serves as the primary contact method and an
     * alternative login identifier (users can log in with either username
     * or email).
     *
     * Email addresses are unique across all member accounts using
     * case-insensitive comparison. The system validates email format and
     * sends a verification email to confirm email ownership before
     * activating full member privileges.
     *
     * This email address will receive important notifications including
     * account verification, password reset instructions, and security
     * alerts. Members can change their email address later through a
     * separate verification process.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for account authentication.
     *
     * Must be at least 8 characters long and contain at least one uppercase
     * letter, one lowercase letter, one number, and one special character
     * (!@#$%^&*()_+-=[]{}|;:,.<>?) to ensure password strength and account
     * security.
     *
     * The password is transmitted to the server in plain text over HTTPS
     * and immediately hashed using a secure one-way hashing algorithm
     * (bcrypt or Argon2) before storage. The system never stores passwords
     * in plain text format.
     *
     * Users are encouraged to create strong, unique passwords. The system
     * validates password strength in real-time during registration and
     * provides feedback on password quality. Commonly compromised passwords
     * (from known breach databases) are rejected to enhance security.
     *
     * This password will be used for future login operations and can be
     * changed later through the account settings with proper verification.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<128>;

    /**
     * Client IP address for session tracking and security monitoring.
     *
     * This field is OPTIONAL and can be provided by the client for
     * server-side rendering (SSR) scenarios where the actual client IP
     * needs to be forwarded. When not provided (null or undefined), the
     * backend server automatically extracts the IP address from the HTTP
     * request headers.
     *
     * The IP address is used for security monitoring, rate limiting, and
     * session management. It helps detect suspicious activities such as
     * multiple failed login attempts from the same IP or concurrent
     * sessions from vastly different geographic locations.
     *
     * For direct browser-to-server connections, clients typically omit this
     * field and let the server detect the IP. For SSR scenarios, the
     * application server should provide the actual client IP to ensure
     * accurate session tracking.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL where the registration session was initiated.
     *
     * This is the MANDATORY current page URL from which the user is
     * registering. It represents the complete URL of the registration page
     * or component, including protocol, domain, path, and any query
     * parameters.
     *
     * The href value is used for session tracking, analytics, and security
     * purposes. It helps identify the context in which the user registered
     * and enables detection of unusual registration patterns or potential
     * security issues.
     *
     * For single-page applications (SPAs), this should be the current
     * browser URL. For multi-page applications, this is the registration
     * page URL. For mobile applications using WebView, this should reflect
     * the appropriate application context.
     *
     * Example values:
     *
     * - 'https://discussion.example.com/register'
     * - 'https://discussion.example.com/signup?source=homepage'
     * - 'https://discussion.example.com/auth/join'
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led to the registration page.
     *
     * This is the MANDATORY previous page URL from which the user navigated
     * to the registration page. It represents the page the user was viewing
     * before deciding to register, providing context about their journey to
     * registration.
     *
     * The referrer value is used for analytics, understanding user
     * acquisition sources, and tracking registration conversion funnels. It
     * helps identify which pages or external sources drive user
     * registrations.
     *
     * For direct navigation (user types URL directly or uses bookmark),
     * this should be an empty string. For navigation from another page,
     * this should be the complete URL of that previous page.
     *
     * Example values:
     *
     * - 'https://discussion.example.com/articles/economic-policy' (registered
     *   after reading an article)
     * - 'https://search.google.com/search?q=economic+discussion+board' (came
     *   from search)
     * - '' (empty string for direct navigation)
     * - 'https://news.example.com/article-with-link' (external referrer)
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Response payload containing authenticated guest session information and
   * JWT tokens.
   *
   * This schema represents the successful result of guest authentication
   * operations, specifically token refresh. It provides the guest session
   * identifier and complete JWT token set necessary for subsequent
   * authenticated API requests.
   *
   * The response includes comprehensive guest session information from the
   * discussion_board_guests table, including the unique session identifier
   * (id and session_token), connection metadata (ip_address and user_agent),
   * and temporal tracking (last_activity_at and created_at). This complete
   * session context enables robust session management, security monitoring,
   * and analytics tracking for unauthenticated users browsing the discussion
   * board.
   *
   * The token object contains both access and refresh tokens following the
   * standardized authentication token structure, enabling guests to maintain
   * authenticated sessions for browsing public content. While guests have
   * read-only access and cannot create content, the JWT tokens authenticate
   * their session for rate limiting, personalization, and potential
   * transition to member registration.
   *
   * This enhanced response provides clients with complete visibility into the
   * guest session state, supporting features like session duration display,
   * activity tracking, and informed decision-making about session management
   * and user experience optimization.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated guest session.
     *
     * This UUID corresponds to the guest record in the
     * discussion_board_guests table. It uniquely identifies this particular
     * guest browsing session across all requests and enables session
     * tracking for analytics and rate limiting purposes.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique session identifier for tracking guest activity across
     * requests.
     *
     * This token uniquely identifies the guest browsing session and is used
     * to track activity patterns, implement rate limiting, and maintain
     * session continuity across multiple API requests. The session token is
     * generated during initial guest access and remains constant throughout
     * the guest's browsing session.
     *
     * Session tokens are enforced as unique in the discussion_board_guests
     * table through a database constraint. They serve as a stable
     * identifier for unauthenticated users who do not have permanent user
     * accounts, enabling basic analytics and security measures like
     * preventing abuse through excessive requests from the same session.
     *
     * The session token is distinct from JWT tokens - it is a simple
     * session identifier stored in the database rather than a
     * cryptographically signed authentication credential. It provides
     * session continuity for guests who are browsing public content without
     * requiring full authentication.
     */
    session_token: string;

    /**
     * IP address of the guest user for security monitoring and rate
     * limiting.
     *
     * Captures the network address from which the guest is accessing the
     * discussion board. This information is critical for implementing
     * security measures including rate limiting to prevent abuse (limiting
     * requests per IP address), detecting suspicious activity patterns or
     * potential bot traffic, identifying geographic access patterns for
     * analytics, and enforcing IP-based access controls if needed.
     *
     * The IP address is automatically extracted from HTTP request headers
     * by the backend server or can be explicitly provided in server-side
     * rendering scenarios. It is stored in the discussion_board_guests
     * table and indexed for efficient querying when implementing rate
     * limiting or security investigations.
     *
     * IP addresses are logged for all guest sessions to maintain security
     * audit trails and enable detection of coordinated abuse attempts from
     * multiple sessions originating from the same network location.
     */
    ip_address: string;

    /**
     * Browser user agent string for analytics and compatibility tracking.
     *
     * Captures the User-Agent HTTP header sent by the guest's browser or
     * client application. This string identifies the browser type, version,
     * operating system, and device used to access the discussion board. The
     * information supports several use cases including tracking browser
     * compatibility and identifying rendering issues, analyzing device
     * distribution (desktop vs mobile vs tablet), detecting bot traffic
     * through user agent patterns, and understanding platform usage across
     * different client environments.
     *
     * The user agent is automatically extracted from HTTP request headers
     * by the backend. It is optional (nullable) because some clients or
     * privacy-focused browsers may not send User-Agent headers, or the
     * header may be blocked by proxies.
     *
     * Stored in the discussion_board_guests table for analytics purposes,
     * this data helps inform technical decisions about browser support,
     * responsive design priorities, and compatibility testing strategies.
     * It is not used for access control but rather for understanding and
     * optimizing the user experience across different platforms.
     */
    user_agent?: string | null | undefined;

    /**
     * Timestamp of the guest's most recent activity for session management.
     *
     * Records the date and time of the guest's last interaction with the
     * discussion board, such as page views, article reads, or API requests.
     * This timestamp is automatically updated by the system on each
     * authenticated request from the guest session.
     *
     * The last activity timestamp serves multiple purposes in session
     * management including identifying inactive sessions for cleanup
     * (sessions with no activity for extended periods may be expired),
     * tracking engagement patterns to understand typical guest browsing
     * duration, implementing session timeout policies, and providing data
     * for analytics about guest user behavior.
     *
     * Stored in ISO 8601 format with timezone information (timestamptz in
     * database). The field is indexed in the discussion_board_guests table
     * to enable efficient queries for session cleanup processes that remove
     * stale guest sessions.
     *
     * Unlike permanent member accounts, guest sessions are temporary and
     * may be purged after extended inactivity. The last_activity_at
     * timestamp is the key field for determining when sessions should be
     * considered abandoned and eligible for deletion.
     */
    last_activity_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the guest session was created.
     *
     * Records the exact date and time when this guest session was first
     * established and the corresponding record was inserted into the
     * discussion_board_guests table. This timestamp is immutable after
     * session creation and provides the start point for session duration
     * calculations.
     *
     * The creation timestamp is used for session lifecycle management
     * including calculating session age for analytics (how long guests
     * browse before leaving or registering), implementing session
     * expiration policies based on absolute session age, tracking guest
     * user acquisition patterns over time, and providing audit trails for
     * security investigations.
     *
     * Stored in ISO 8601 format with timezone information (timestamptz in
     * database). Combined with last_activity_at, this enables
     * differentiation between total session lifetime and active browsing
     * time, helping understand guest engagement patterns and typical
     * conversion timelines from guest to registered member.
     */
    created_at: string & tags.Format<"date-time">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Request payload for refreshing JWT access token using a valid refresh
   * token.
   *
   * This schema represents the data required to refresh an expired access
   * token without requiring full re-authentication. The refresh mechanism
   * enables seamless session continuation for guest users browsing the
   * discussion board.
   *
   * When an access token expires after its 30-minute lifespan, users can use
   * their refresh token (valid for 14 days) to obtain a new access token.
   * This prevents interruption of browsing activities and maintains user
   * session state without requiring repeated credential entry.
   *
   * The refresh operation validates the provided refresh token's
   * authenticity, expiration status, and association with a valid session
   * before issuing new tokens. Rate limiting is applied to prevent abuse and
   * brute-force attacks on the refresh mechanism.
   */
  export type IRefresh = {
    /**
     * Valid refresh token issued during previous authentication.
     *
     * This token is used to obtain a new access token when the current
     * access token expires. The refresh token has a 14-day lifespan and
     * must be valid and not expired for the operation to succeed.
     *
     * The refresh token is typically stored securely in httpOnly cookies or
     * secure client storage and transmitted with refresh requests to
     * maintain session continuity without requiring users to re-enter
     * credentials.
     */
    refresh_token: string;
  };
}
