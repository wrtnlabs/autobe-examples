import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardAuth {
  /**
   * Authentication credentials for user login.
   *
   * This interface represents the data required for a user (member or
   * moderator) to authenticate and access the discussion board system. It
   * collects the username or email address along with the password for
   * credential validation.
   *
   * The login process validates these credentials against stored records in
   * either the discussion_board_members or discussion_board_moderators
   * tables. The system checks the password against the securely hashed
   * password_hash field using industry-standard algorithms.
   *
   * Additionally, this interface captures session context metadata (IP
   * address, connection URL, and referrer) that is recorded in the session
   * tracking tables (discussion_board_member_sessions or
   * discussion_board_moderator_sessions) for security auditing and activity
   * monitoring purposes.
   *
   * Successful authentication results in the issuance of JWT access and
   * refresh tokens, enabling the user to access authenticated features
   * throughout the system.
   */
  export type ILogin = {
    /**
     * Username or email address for user identification.
     *
     * This field accepts either the user's unique username or their
     * registered email address for authentication purposes. The system
     * performs a case-insensitive lookup against both the username and
     * email fields in the discussion_board_members and
     * discussion_board_moderators tables.
     *
     * Usernames must be 3-30 characters containing only alphanumeric
     * characters, underscores, and hyphens. Email addresses must follow
     * standard email format validation with @ symbol and valid domain
     * structure.
     *
     * The flexibility to accept either username or email improves user
     * experience by allowing users to log in with their preferred
     * identifier without remembering which one they used during
     * registration.
     */
    username_or_email: string;

    /**
     * User password for authentication validation.
     *
     * This is the plain text password provided by the user for
     * authentication. The system validates this password against the stored
     * password_hash field in the user's account record using secure hashing
     * algorithms (bcrypt, Argon2, or equivalent).
     *
     * Passwords must meet the following strength requirements: minimum 8
     * characters in length, at least one uppercase letter (A-Z), at least
     * one lowercase letter (a-z), at least one number (0-9), and at least
     * one special character from the set !@#$%^&*()_+-=[]{}|;:,.<>?.
     *
     * The password is transmitted securely over HTTPS and never stored in
     * plain text. After validation, the plain text password is immediately
     * discarded and only the JWT tokens are retained for session
     * management.
     */
    password: string;

    /**
     * Client IP address for session tracking and security monitoring.
     *
     * This optional field captures the IP address from which the user is
     * connecting. While the server can extract this from the request
     * headers, clients may provide it explicitly in server-side rendering
     * (SSR) scenarios where the backend server makes the request on behalf
     * of the actual client.
     *
     * The IP address is stored in the session table
     * (discussion_board_member_sessions or
     * discussion_board_moderator_sessions) and used for security purposes
     * including detecting suspicious login patterns, preventing brute force
     * attacks through rate limiting (5 failed attempts within 15 minutes),
     * and providing users with visibility into active sessions from
     * different locations.
     *
     * IP addresses are logged for all authentication events to maintain a
     * comprehensive security audit trail and enable investigation of
     * unauthorized access attempts.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL where the login request originated.
     *
     * This required field captures the full URL of the page where the user
     * initiated the login action. It represents the current page context
     * and is essential for security auditing and user experience tracking.
     *
     * The href is stored in the session table and provides valuable context
     * for understanding user authentication patterns, detecting phishing
     * attempts (unexpected URLs), and analyzing user entry points into the
     * authenticated system.
     *
     * Unlike the IP address which can be extracted server-side, the href
     * must be provided by the client as the server cannot reliably infer
     * the exact page URL that triggered the authentication request,
     * especially in single-page applications or complex routing scenarios.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the previous page before login.
     *
     * This required field captures the URL of the page that led the user to
     * the login page. It represents the navigation context and helps track
     * user journeys and authentication flow patterns.
     *
     * The referrer is stored in the session table for analytics purposes,
     * understanding how users arrive at the login page (direct access,
     * article link, search result, etc.), and detecting potential security
     * issues such as login requests originating from unexpected external
     * sites.
     *
     * For direct navigation to the login page, this field should be
     * provided as an empty string. The client must always provide this
     * field explicitly as the server-side HTTP Referer header may be
     * unreliable or blocked by privacy-conscious browsers.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Authentication result containing JWT tokens and user identity.
   *
   * This interface represents the complete authentication response returned
   * after successful credential validation. It provides all information
   * necessary for the client to establish an authenticated session and
   * identify the logged-in user.
   *
   * The response includes both access and refresh JWT tokens following the
   * dual-token authentication pattern. The access token is short-lived (30
   * minutes) and used for authorizing API requests, while the refresh token
   * is longer-lived (30 days) and used to obtain new access tokens without
   * requiring the user to re-enter credentials.
   *
   * User identity information including ID, username, display name, role, and
   * email verification status enables the client to personalize the user
   * interface and determine available functionality based on user permissions
   * and account state.
   */
  export type ILoginResult = {
    /**
     * Unique identifier of the authenticated user.
     *
     * This is the primary key (id field) from either the
     * discussion_board_members or discussion_board_moderators table,
     * depending on which user type successfully authenticated. The ID
     * uniquely identifies the user across the entire system and is used to
     * associate all user-generated content and activity.
     *
     * This UUID value is included in the JWT token payload and used
     * throughout the application to reference the authenticated user when
     * creating articles, posting comments, or performing any authenticated
     * actions.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Username of the authenticated user.
     *
     * This is the unique username from either the discussion_board_members
     * or discussion_board_moderators table. The username is the user's
     * primary public identifier displayed on articles, comments, and
     * throughout the system.
     *
     * Usernames are 3-30 characters in length, containing only alphanumeric
     * characters, underscores, and hyphens. This value is used for display
     * purposes and helps clients personalize the user interface with the
     * authenticated user's identity.
     */
    username: string;

    /**
     * Optional display name for public presentation.
     *
     * This is the display_name field from the user's profile, which
     * provides an alternative name for public display instead of the
     * username. If the user has set a custom display name (1-50
     * characters), it is returned here and should be used for UI
     * presentation in preference to the username.
     *
     * If the user has not set a display name (field is null in the
     * database), the client should fall back to displaying the username.
     * This allows users to have a more personalized or professional
     * presentation name while maintaining a unique username for
     * authentication.
     */
    display_name?: string | null | undefined;

    /**
     * Email address of the authenticated user.
     *
     * This is the email field from the user's account record. The email
     * address is the user's registered contact method and alternative
     * authentication identifier.
     *
     * Email addresses are validated to follow standard email format
     * (contains @ symbol, valid domain structure) and are unique across all
     * user accounts. This value is provided to enable email-based features
     * and user identification, though it should be kept private and not
     * exposed in public user interfaces.
     */
    email: string & tags.Format<"email">;

    /**
     * Email verification status of the authenticated user.
     *
     * This is the email_verified field from the user's account record,
     * indicating whether the user has completed the email verification
     * process by clicking the verification link sent to their registered
     * email address.
     *
     * This boolean value must be true for the user to successfully
     * authenticate - users with unverified emails (email_verified: false)
     * are denied login and prompted to verify their email. The client can
     * use this value to display verification status or prompt
     * re-verification if needed.
     */
    email_verified: boolean;

    /**
     * User role designation for permission management.
     *
     * This field indicates whether the authenticated user is a 'member' or
     * 'moderator', determining their permission level throughout the
     * system. Members have standard content creation and participation
     * privileges, while moderators have elevated permissions for content
     * management, user moderation, and community oversight.
     *
     * The role is determined by which table the user authenticated from:
     * discussion_board_members yields role 'member', while
     * discussion_board_moderators yields role 'moderator'. This value is
     * included in the JWT token payload and used for role-based access
     * control (RBAC) throughout the application.
     *
     * The client uses this role information to show or hide UI elements
     * based on permissions, such as moderation dashboard access, content
     * editing controls for all articles, and user management features.
     */
    role: string;

    /**
     * Current account status of the authenticated user.
     *
     * This is the status field from the user's account record, indicating
     * the account's current state. Valid values include
     * 'pending_email_verification', 'active', 'suspended', or 'deleted'.
     *
     * For successful login, this value will always be 'active' because the
     * authentication logic prevents login for accounts in other states.
     * Pending accounts are denied until email verification, suspended
     * accounts cannot log in and see suspension messages, and deleted
     * accounts are permanently inaccessible.
     *
     * The client can use this status information to understand account
     * state and display appropriate messaging or restrictions, though in
     * practice only 'active' accounts will receive authentication tokens.
     */
    status: string;

    /**
     * Profile visibility preference setting.
     *
     * This is the profile_visibility field from the user's account record,
     * controlling who can view the user's profile information. Valid values
     * are 'public' (visible to all users including guests), 'members_only'
     * (visible only to authenticated members and moderators), or 'private'
     * (visible only to moderators).
     *
     * New accounts default to 'public' visibility. This setting affects
     * whether the user's profile page, display information, and identity
     * details are accessible to different user types throughout the
     * system.
     *
     * The client can use this information to respect privacy settings when
     * displaying user information in various contexts and to allow users to
     * manage their visibility preferences in account settings.
     */
    profile_visibility: string;

    /**
     * Activity history visibility preference setting.
     *
     * This is the activity_visibility field from the user's account record,
     * controlling who can view the user's activity history including their
     * articles and comments. Valid values are 'public' (activity visible to
     * all users including guests), 'members_only' (activity visible only to
     * authenticated members), or 'hidden' (activity list not displayed on
     * profile).
     *
     * New accounts default to 'public' activity visibility. This setting
     * affects whether the user's profile page shows lists of their
     * published articles and posted comments, though the content itself
     * remains accessible through normal search and browsing regardless of
     * this setting.
     *
     * The client can use this information to control activity display in
     * profile views and allow users to manage their activity privacy in
     * account settings.
     */
    activity_visibility: string;

    /**
     * Optional biography or self-description of the authenticated user.
     *
     * This is the bio field from either discussion_board_members or
     * discussion_board_moderators table, allowing users to describe their
     * interests, expertise, or perspective on economic and political
     * topics. The bio is displayed on the user's public profile if
     * profile_visibility allows.
     *
     * Maximum 500 characters. Basic text formatting such as line breaks is
     * preserved, but HTML tags are stripped to prevent XSS attacks. This
     * helps other community members understand the user's background when
     * reading their contributions.
     */
    bio?: string | null | undefined;

    /**
     * Optional geographic location of the authenticated user.
     *
     * This is the location field from either discussion_board_members or
     * discussion_board_moderators table. A free-text field (maximum 100
     * characters) where users can specify their city, country, region, or
     * any geographic identifier they wish to share. No geocoding or
     * validation is performed - it is purely informational and displayed on
     * the user's public profile.
     *
     * Location information provides context for users' perspectives on
     * regional economic policies or political developments.
     */
    location?: string | null | undefined;

    /**
     * Optional personal or professional website URL of the authenticated
     * user.
     *
     * This is the website_url field from either discussion_board_members or
     * discussion_board_moderators table. Users can provide a link to their
     * personal blog, professional profile, research page, or other web
     * presence. The URL must be properly formatted with http:// or https://
     * protocol and is displayed as a clickable link on the user's public
     * profile.
     *
     * This field enables users to share their credentials, additional
     * writings, or institutional affiliations with the community.
     */
    website_url?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * URL of the authenticated user's profile picture or avatar.
     *
     * This is the profile_picture_url field from either
     * discussion_board_members or discussion_board_moderators table. Points
     * to the user's uploaded profile picture, which is displayed throughout
     * the platform in article bylines, comment attribution, and the user's
     * profile page. If null, the system displays a default avatar image.
     *
     * Profile pictures are uploaded through a separate file upload endpoint
     * and stored in the file storage system. This field contains only the
     * URL reference to the stored image.
     */
    profile_picture_url?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Timestamp of the user's most recent successful login before this
     * authentication.
     *
     * This is the last_login_at field from either discussion_board_members
     * or discussion_board_moderators table. Automatically updated each time
     * the user successfully authenticates. Used for account security
     * monitoring, inactive account detection, and activity analytics.
     *
     * The timestamp is in ISO 8601 format with timezone information (stored
     * as timestamptz in database). A null value indicates the user has
     * never logged in since account creation, which would only occur on the
     * very first login.
     */
    last_login_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when the user account was originally created.
     *
     * This is the created_at field from either discussion_board_members or
     * discussion_board_moderators table. An immutable field set
     * automatically during account registration. Used for calculating
     * account age, displaying 'member since' information, sorting users by
     * join date, and audit trail purposes.
     *
     * The timestamp is in ISO 8601 format with timezone information,
     * representing the exact moment the user record was inserted into the
     * database.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the user profile was last modified.
     *
     * This is the updated_at field from either discussion_board_members or
     * discussion_board_moderators table. Automatically updated whenever any
     * user account information changes, including profile edits, password
     * changes, privacy setting updates, or status changes. Helps track
     * account maintenance activity and identify recently updated profiles.
     *
     * The timestamp is in ISO 8601 format with timezone information,
     * representing the most recent modification to any field in the user
     * record.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp for the user account.
     *
     * This is the deleted_at field from either discussion_board_members or
     * discussion_board_moderators table. When a user deletes their account,
     * this field is set to the deletion timestamp rather than immediately
     * removing the record. This enables account recovery during a grace
     * period, maintains referential integrity for authored articles and
     * comments, and preserves audit trail for moderation records.
     *
     * A null value indicates the account is active. A non-null value would
     * indicate the account is soft-deleted, though in practice this field
     * should always be null in successful login responses since deleted
     * accounts cannot authenticate.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * JSON string defining specific moderation permissions and access
     * levels.
     *
     * This is the moderation_permissions field from the
     * discussion_board_moderators table. Only populated when the
     * authenticated user is a moderator (role equals 'moderator'). Null for
     * member users as this field does not exist in the
     * discussion_board_members table.
     *
     * The JSON structure specifies granular moderation capabilities such as
     * can_edit_articles, can_delete_articles, can_edit_comments,
     * can_delete_comments, can_issue_warnings, can_suspend_users,
     * can_ban_users, can_manage_reports, and can_manage_categories. These
     * permissions determine which moderation actions the moderator can
     * perform and are checked at the application layer when moderators
     * attempt to execute enforcement operations.
     */
    moderation_permissions?: string | null | undefined;

    /**
     * JWT token information for session authentication.
     *
     * This object contains both the access token and refresh token required
     * for maintaining an authenticated session. The access token is a
     * short-lived JWT (30-minute expiration) included in the Authorization
     * header of API requests to prove user identity and permissions. The
     * refresh token is a longer-lived JWT (30-day expiration) used to
     * obtain new access tokens when the current access token expires,
     * enabling seamless session continuation without requiring the user to
     * re-enter credentials.
     *
     * Both tokens are cryptographically signed using the server's secret
     * key and contain claims such as user ID, role, and expiration
     * timestamps. The client must store these tokens securely and use them
     * according to the authentication flow defined in the system
     * requirements.
     */
    token: IAuthorizationToken;
  };

  /**
   * Response confirming successful termination of an authenticated user
   * session.
   *
   * This type represents the result of a logout operation for either a member
   * or moderator actor. When logout succeeds, the system has marked the
   * current session as expired in the database by setting the expired_at
   * timestamp, preventing the refresh token from being reused to obtain new
   * access tokens.
   *
   * The logout operation only affects the current device's session - users
   * may remain logged in on other devices if they have multiple active
   * sessions. The operation extracts session information from the JWT access
   * token, so no request parameters are needed. After logout, users must
   * perform fresh authentication (login) to regain access to protected
   * features.
   *
   * This response type is returned by both the member logout operation (POST
   * /discussionBoard/member/auth/logout) and the moderator logout operation
   * (POST /discussionBoard/moderator/auth/logout), providing a consistent
   * logout experience across different user actor types.
   */
  export type ILogoutResult = {
    /**
     * Indicates whether the logout operation completed successfully.
     *
     * When true, the member or moderator session has been properly
     * terminated by setting the expired_at timestamp in the respective
     * session table (discussion_board_member_sessions or
     * discussion_board_moderator_sessions). The refresh token associated
     * with this session has been invalidated and can no longer be used to
     * obtain new access tokens.
     *
     * The client application must discard both the access token and refresh
     * token from local storage upon receiving a successful logout response
     * to complete the logout process on the client side.
     */
    success: boolean;

    /**
     * Human-readable confirmation message describing the logout result.
     *
     * Provides user-friendly feedback about the session termination, such
     * as 'Logout successful' or 'Your session has been ended'. This message
     * can be displayed to users to confirm their logout action was
     * processed.
     *
     * The message maintains a consistent, professional tone appropriate for
     * an economic and political discussion board platform.
     */
    message: string;
  };

  /**
   * Request payload for refreshing authentication tokens to maintain active
   * session.
   *
   * This request is submitted when a client needs to obtain a new access
   * token because the current access token has expired or is about to expire.
   * Token refresh is a fundamental part of modern authentication systems that
   * balance security (short-lived access tokens) with user experience
   * (long-lived sessions without repeated logins).
   *
   * Authentication architecture context: The discussion board uses JWT (JSON
   * Web Token) based authentication with two token types serving different
   * purposes. Access tokens are short-lived (30 minutes) and included in
   * every authenticated API request via the Authorization header, containing
   * user identity and permission claims. Refresh tokens are long-lived (14-30
   * days) and used exclusively for obtaining new access tokens, not for
   * direct API authentication, with each token associated with a database
   * session record.
   *
   * The refresh token provided in this request must be valid, unexpired, and
   * associated with an active user session. The system validates the token
   * and session state by querying the session tables
   * (discussion_board_member_sessions or
   * discussion_board_moderator_sessions), checking the session's created_at
   * and expired_at timestamps, and verifying the associated user account
   * status.
   *
   * Successful refresh operation: When validation succeeds, the system
   * generates a new access token with fresh 30-minute expiration, optionally
   * rotates the refresh token for enhanced security (issuing a new refresh
   * token and invalidating the old one), updates the session record if token
   * rotation occurs, and returns the new token set to the client for
   * continued authenticated access.
   *
   * Failure scenarios: Token refresh fails when the refresh token is expired
   * (beyond its validity period), the associated session has been explicitly
   * expired (expired_at field is set), the user account is suspended,
   * deleted, or otherwise inactive (status field check), the refresh token
   * has been invalidated due to password change or security event, or the
   * token signature is invalid or the token has been tampered with.
   *
   * Client implementation: Clients should call this endpoint when the access
   * token expires or is about to expire, handle refresh failures by
   * redirecting users to login, implement automatic retry logic for transient
   * failures, and maintain security by protecting the refresh token in secure
   * storage.
   */
  export type IRefresh = {
    /**
     * Current refresh token to exchange for new access token.
     *
     * This is the refresh token that was previously issued during login or
     * the last token refresh operation. The token is associated with an
     * active session record in the discussion_board_member_sessions or
     * discussion_board_moderator_sessions table.
     *
     * The refresh token serves as proof of an existing authenticated
     * session and authorizes the issuance of a new access token without
     * requiring the user to re-enter their username and password. This
     * enables seamless session continuation when the short-lived access
     * token (30-minute validity) expires.
     *
     * Token validation process: The system validates this refresh token by
     * checking its signature and expiration (typically 14-30 days
     * validity), verifying the associated session exists in the database
     * and has not been explicitly expired (expired_at field is null or in
     * the future), confirming the user account is still active (status
     * field is 'active' in discussion_board_members or
     * discussion_board_moderators table), and ensuring the session has not
     * been invalidated due to security events (password changes, suspicious
     * activity, or explicit logout).
     *
     * Security considerations: Refresh tokens are long-lived credentials
     * that should be stored securely by clients (httpOnly cookies or secure
     * client storage), never exposed in URLs, logs, or client-side
     * JavaScript accessible locations, transmitted only over HTTPS
     * connections, and invalidated immediately when users log out or change
     * passwords.
     *
     * Clients should implement token refresh logic that proactively
     * refreshes access tokens before expiration (within 5 minutes of
     * expiry) or reactively refreshes when receiving 401 Unauthorized
     * responses, handles refresh failures by redirecting to login, and
     * manages token storage securely across application restarts.
     */
    refresh_token: string;
  };

  /**
   * Authentication tokens issued upon successful login or token refresh.
   *
   * This response contains all tokens necessary for maintaining an
   * authenticated session in the discussion board system. The structure
   * follows OAuth 2.0 token response conventions with JWT (JSON Web Token)
   * implementation for stateless authentication.
   *
   * The access token provides short-term authentication for API requests and
   * expires after 30 minutes to limit the window of vulnerability if
   * compromised. The refresh token provides long-term session maintenance,
   * allowing users to obtain new access tokens without re-entering
   * credentials, with validity typically lasting 14-30 days.
   *
   * Clients should implement token management logic that stores both tokens
   * securely, includes the access token in all authenticated requests,
   * monitors token expiration, and uses the refresh token to obtain new
   * access tokens before or immediately after the access token expires.
   *
   * Security model: The system uses JWT tokens signed with HS256 algorithm,
   * with access tokens containing user identity and permission claims.
   * Session state is tracked in the database through session tables
   * (discussion_board_member_sessions or
   * discussion_board_moderator_sessions), allowing session invalidation when
   * users log out, change passwords, or when suspicious activity is
   * detected.
   */
  export type ITokens = {
    /**
     * JWT access token for authenticated API requests.
     *
     * This token must be included in the Authorization header of all
     * subsequent API requests requiring authentication. The token contains
     * encoded claims including user ID, role (member or moderator),
     * username, and email verification status.
     *
     * The access token has a 30-minute validity period from the time of
     * issuance. After expiration, clients should use the refresh operation
     * to obtain a new access token without requiring the user to re-enter
     * credentials.
     *
     * Format: Bearer token following JWT (JSON Web Token) standard, signed
     * with HS256 algorithm. Clients should store this token securely and
     * include it in the Authorization header as 'Bearer {access_token}' for
     * authenticated requests.
     */
    access_token: string;

    /**
     * Token type indicator for HTTP Authorization header.
     *
     * This field always contains the value 'Bearer', indicating that the
     * access_token should be used as a Bearer token in the Authorization
     * header of HTTP requests.
     *
     * Clients should construct the Authorization header as: 'Authorization:
     * Bearer {access_token}'
     */
    token_type: "Bearer";

    /**
     * Access token expiration time in seconds.
     *
     * Indicates how many seconds from the time of issuance the access token
     * will remain valid. For this system, access tokens expire after 1800
     * seconds (30 minutes).
     *
     * Clients can use this value to determine when to refresh the token
     * proactively, ensuring seamless user experience by refreshing before
     * expiration rather than waiting for authentication errors.
     */
    expires_in: number & tags.Type<"int32">;

    /**
     * Refresh token for obtaining new access tokens.
     *
     * This token enables users to obtain new access tokens when the current
     * access token expires, without requiring re-authentication with
     * username and password. The refresh token is used with the token
     * refresh operation.
     *
     * The refresh token has a longer validity period than the access token
     * (typically 14-30 days) and should be stored securely by the client.
     * When the access token expires, clients should call the refresh
     * endpoint with this token to receive a new access token.
     *
     * Security considerations: Refresh tokens should be stored securely
     * (httpOnly cookies or secure client storage), never exposed in URLs or
     * logs, and invalidated when the user explicitly logs out or changes
     * their password. Each refresh token is associated with a specific
     * session record in the database (discussion_board_member_sessions or
     * discussion_board_moderator_sessions table).
     */
    refresh_token: string;
  };

  /**
   * Email verification request containing the verification token from the
   * registration email.
   *
   * This request body is used to verify a user's email address and activate
   * their account after registration. Email verification is a mandatory step
   * in the user registration workflow that confirms the user has access to
   * the provided email address.
   *
   * This is a SELF-AUTHENTICATION operation where the user themselves is
   * verifying their email and establishing their first authenticated session.
   * Upon successful verification, the system automatically logs in the user
   * and creates a session record in discussion_board_member_sessions or
   * discussion_board_moderator_sessions. Therefore, session context fields
   * (ip, href, referrer) are REQUIRED to populate the session table.
   *
   * The verification token is sent to the user's email address during
   * registration and must be submitted to this operation to complete account
   * activation. Upon successful verification, the user's account transitions
   * from pending_email_verification status to active status, and the
   * email_verified field is set to true in the discussion_board_members or
   * discussion_board_moderators table.
   *
   * The href and referrer fields are MANDATORY as they capture the
   * verification context and cannot be inferred server-side. The ip field is
   * OPTIONAL since the server can extract it from the HTTP request, but
   * clients MAY provide it for SSR scenarios.
   *
   * This operation is part of the authentication flow and does not require
   * prior authentication, as it occurs before the user can log in. However,
   * it results in immediate authentication and session creation upon
   * success.
   */
  export type IVerifyEmail = {
    /**
     * Email verification token received in the verification email during
     * registration.
     *
     * This is a unique, cryptographically secure token with 24-hour
     * validity that confirms email ownership. The token is generated when a
     * user registers and sent to their email address. It must be provided
     * exactly as received in the verification email link.
     *
     * The token is validated through application logic using a secure token
     * service or cache layer, as verification tokens are not stored in the
     * Prisma database tables.
     */
    token: string;

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
     * session management when the user is automatically logged in after
     * successful email verification. It populates the ip field in the
     * discussion_board_member_sessions or
     * discussion_board_moderator_sessions table.
     *
     * For direct browser-to-server connections, clients typically omit this
     * field and let the server detect the IP. For SSR scenarios, the
     * application server should provide the actual client IP to ensure
     * accurate session tracking.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL where the email verification was performed.
     *
     * This is the MANDATORY current page URL from which the user is
     * verifying their email address. It represents the complete URL of the
     * verification page or component, including protocol, domain, path, and
     * any query parameters.
     *
     * The href value is used for session tracking, analytics, and security
     * purposes when creating the initial authenticated session after
     * successful verification. It populates the href field in the
     * discussion_board_member_sessions or
     * discussion_board_moderator_sessions table.
     *
     * For single-page applications (SPAs), this should be the current
     * browser URL. For verification links that open in email clients or
     * browsers, this is the landing page URL where verification completes.
     *
     * Example values:
     *
     * - 'https://discussion.example.com/verify-email?token=xyz'
     * - 'https://discussion.example.com/auth/verify'
     * - 'https://discussion.example.com/welcome?verified=true'
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led to the email verification page.
     *
     * This is the MANDATORY previous page URL from which the user navigated
     * to complete email verification. It represents the page the user was
     * viewing before clicking the verification link in their email or
     * before navigating to the verification interface.
     *
     * The referrer value is used for analytics and understanding user
     * verification flows. It populates the referrer field in the
     * discussion_board_member_sessions or
     * discussion_board_moderator_sessions table when the initial session is
     * created upon successful verification.
     *
     * For verification links clicked directly from email clients, this may
     * be the email client identifier or an empty string. For web-based
     * email clients, this would be the webmail URL.
     *
     * Example values:
     *
     * - 'https://mail.google.com/' (clicked verification link from Gmail)
     * - 'https://discussion.example.com/' (navigated from homepage to
     *   verification)
     * - '' (empty string for direct link access from native email clients)
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Result of email verification operation indicating success status and
   * providing authentication tokens for immediate login.
   *
   * This response is returned after validating an email verification token.
   * When verification succeeds, the user's account is activated by updating
   * the email_verified field to true and changing the account status from
   * pending_email_verification to active in the discussion_board_members or
   * discussion_board_moderators table.
   *
   * Successful verification includes authentication tokens enabling immediate
   * login without requiring the user to manually enter credentials. This
   * streamlines the user experience by allowing newly registered users to
   * begin using the platform immediately after email verification.
   *
   * The response includes a success boolean indicating verification outcome,
   * a user-friendly message explaining the result and next steps, and JWT
   * tokens for authenticated access when verification succeeds. If
   * verification fails due to invalid or expired tokens, the response
   * indicates failure and provides guidance on requesting a new verification
   * email.
   */
  export type IVerificationResult = {
    /**
     * Indicates whether email verification was successful.
     *
     * When true, the user's email has been verified, their account status
     * has been updated from pending_email_verification to active, and the
     * email_verified field has been set to true in the database. The user
     * can now log in and access full platform features.
     *
     * When false, verification failed due to invalid token, expired token,
     * or other validation issues.
     */
    success: boolean;

    /**
     * Human-readable message explaining the verification result.
     *
     * For successful verification, this message confirms account activation
     * and may provide next steps such as logging in. For failed
     * verification, this message explains what went wrong and how to
     * resolve the issue, such as requesting a new verification email if the
     * token expired.
     *
     * Messages follow user-friendly error message standards, providing
     * clear explanations and actionable guidance without technical jargon.
     */
    message: string;

    /**
     * JWT authentication tokens for immediate login after successful email
     * verification.
     *
     * Provided only when verification is successful, enabling the user to
     * access the platform immediately without requiring a separate login
     * step. Contains both access token (30-minute expiration) and refresh
     * token (14-day expiration) following the JWT authentication
     * requirements.
     *
     * This field is null or omitted when verification fails.
     */
    token?: IAuthorizationToken | undefined;
  };
}
