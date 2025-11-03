import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardModerator {
  /**
   * Request body containing the credentials required to register a new
   * moderator account. This object defines the data needed to create a new
   * moderator account in the system. The email field must be a valid, unique
   * email address that will serve as the authentication identifier. The
   * password must meet security policy requirements and will be hashed by the
   * backend before storage in the discussion_board_moderators table. This
   * schema directly maps to the fields in the discussion_board_moderators
   * Prisma model: email (unique identifier, not nullable) and password_hash
   * (hashed value, not nullable). The email_verified field is not included in
   * this schema because it is automatically initialized to false during
   * registration and must be set to true through a separate email
   * verification process.
   */
  export type ICreate = string;

  /**
   * Response body contains the authentication tokens and moderator account
   * information following successful authentication.
   *
   * This schema defines the structure of the authorization response for a
   * successfully authenticated moderator user. The object contains two
   * essential fields:
   *
   * 1. Id: A UUID that uniquely identifies the moderator in the system, taken
   *    directly from the JWT token payload and corresponding to the id field
   *    in the discussion_board_moderators table.
   * 2. Token: A reference to the IAuthorizationToken schema which includes:
   *
   *    - Access: The JWT access token for authenticated requests (30-minute
   *         expiration)
   *    - Refresh: The refresh token for obtaining new access tokens (7-day
   *         expiration)
   *    - Expired_at: ISO 8601 timestamp indicating when the access token expires
   *    - Refreshable_until: ISO 8601 timestamp indicating when the refresh token
   *         expires
   *
   * The IDiscussionBoardModerator.IAuthorized response is generated
   * exclusively during the login process (/auth/moderator/login) and refresh
   * process (/auth/moderator/refresh). It provides the minimal necessary
   * information for clients to maintain authenticated sessions without
   * exposing sensitive user data or system internals.
   *
   * This schema directly corresponds to the discussion_board_moderators
   * Prisma model, ensuring that the token structure references the user's
   * unique identifier and role as stored in the database. The implementation
   * follows the system's authentication requirements where moderators must
   * authenticate before performing any moderation actions, and the token
   * structure aligns securely with the JWT-based authentication system.
   *
   * The x-autobe-prisma-schema field is included to establish a direct link
   * to the Prisma model, ensuring traceability between the API schema and the
   * underlying database structure. This link is critical for automated system
   * components to validate consistency between the data model and API
   * contracts.
   *
   * Client applications must store the access and refresh tokens securely
   * (e.g., in HTTP-only cookies or secure storage) and include the access
   * token in the Authorization header for subsequent requests as "Bearer
   * {token}". The refresh token must be protected and transmitted only to the
   * refresh endpoint to maintain session security.
   *
   * Note: The moderator's email, role, and other attributes are encoded
   * within the JWT token itself and are not included in this response body to
   * minimize exposure. This design follows the principle of least disclosure
   * for secure authentication responses.
   *
   * This schema type strictly adheres to the business requirements for
   * moderator authentication as defined in 01-user-actors.md (Authentication
   * Requirements) and ensures accurate modeling of the data flow from
   * discussion_board_moderators to the authentication system.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated moderator, taken from the JWT
     * payload.
     *
     * This field contains the UUID that uniquely identifies the moderator
     * in the system, corresponding to the id field in the
     * discussion_board_moderators table.
     *
     * The id is included in the JWT token payload during authentication and
     * provides a direct reference to the moderator's account record in the
     * database. This allows the system to validate the moderator's identity
     * and permissions on every request without requiring additional
     * database queries.
     *
     * The UUID format ensures global uniqueness across distributed systems
     * and cannot be easily guessed or enumerated, providing security
     * against enumeration attacks. All moderator-related operations on the
     * platform use this identifier to establish account ownership and
     * authorization context.
     *
     * This field is essential for maintaining stateless authentication
     * while providing unambiguous identification of the moderator making
     * each API request.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Request body containing the moderator's email and password to
   * authenticate and generate access tokens.
   *
   * This schema defines the data required for moderator authentication. The
   * email must exactly match an existing record in the
   * discussion_board_moderators table and must have email_verified set to
   * true. The password will be verified against the stored password_hash.
   *
   * This operation is a self-login (authorizationActor: "moderator"), meaning
   * the authenticated actor is themselves establishing their session.
   * Therefore, session context fields MUST be included:
   *
   * - Ip: Client IP address (optional - server can extract from request)
   * - Href: Current page URL (mandatory)
   * - Referrer: Previous page URL (mandatory)
   *
   * These session fields are written to the
   * discussion_board_moderator_sessions table upon successful authentication.
   * They are not authentication fields but rather connection metadata for
   * audit and security purposes.
   *
   * No owner, creator, or update fields are included because the system
   * automatically associates the session with the authenticated moderator
   * through JWT validation.
   *
   * CRITICAL BUSINESS CONTEXT RESTRICTION: These fields (ip, href, referrer)
   * are NOT used for authentication validation (which is handled by
   * email/password). They are session tracking fields written to the
   * discussion_board_moderator_sessions table during successful
   * authentication, functioning as audit trails for every moderator session
   * initiation.
   */
  export type ILogin = {
    /**
     * Unique email address used for authentication and notifications. Must
     * be verified before moderating content.
     */
    email: string & tags.Format<"email">;

    /**
     * Password for authentication. Never stored in plain text. Required for
     * login functionality. Password will be hashed by the backend and
     * stored in the password_hash field.
     */
    password: string;

    /**
     * Client IP address for session tracking (OPTIONAL - server can
     * extract, but client may provide for SSR). This field is included
     * because this is a self-login operation where the actor is
     * establishing their own session.
     *
     * This field is a critical component for establishing the initial
     * session context in the system. When a moderator logs in from a client
     * device, the IP address associated with that request is recorded in
     * the discussion_board_moderator_sessions table. This information aids
     * in security audits and helps detect account compromise patterns such
     * as logins from unusual geographic locations. The system can extract
     * this value from the HTTP request headers, but allowing the client to
     * send it ensures more precise IP tracking in distributed or
     * reverse-proxy environments.
     */
    ip?: string | null | undefined;

    /**
     * Connection URL (current page URL) - MANDATORY. This field is included
     * because this is a self-login operation where the actor is
     * establishing their own session.
     *
     * This field records the exact page URL from which the moderator
     * initiated the login process. This information is captured in the href
     * property of the discussion_board_moderator_sessions table and is
     * essential for user journey analysis and security logging. It helps
     * track the entry points into the system and identify potential
     * phishing scripts or malicious redirects that lead to login pages. For
     * example, if the href is a suspicious domain not part of the
     * legitimate application, it could indicate an attempt to harvest
     * credentials. This field is mandatory for every login attempt and must
     * be provided by the client as part of the authentication flow.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (previous page URL) - MANDATORY. This field is included
     * because this is a self-login operation where the actor is
     * establishing their own session.
     *
     * This field records the previous page URL from which the moderator
     * navigated to the login page. This information is stored in the
     * referrer property of the discussion_board_moderator_sessions table
     * and is vital for security intelligence. It helps distinguish between
     * legitimate logins (e.g., from the application's main page) and
     * suspicious login attempts originating from third-party websites or
     * malware. Helps prevent credential stuffing attacks and identify
     * compromised referral sources. This field must always be provided by
     * the client during login as a mandatory part of the session
     * establishment.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Request body containing the valid refresh token to obtain a new access
   * token.
   *
   * This schema defines the required parameter to renew an expired access
   * token. The refresh token must be valid and not expired, and the moderator
   * account it authenticates must be active in the system (no soft delete).
   * This operation is governed by business logic that requires the underlying
   * moderator record to exist and be active (deleted_at is null in
   * discussion_board_moderators). The refresh token must originate from a
   * previous successful login and must not have been revoked via the system's
   * token infrastructure. A valid refresh token always corresponds to a
   * single active session in the discussion_board_moderator_sessions table.
   * This operation will only proceed if the associated moderator account
   * record exists, has not been deleted, and represents a currently active
   * authentication context.
   */
  export type IRefresh = {
    /**
     * The valid refresh token used to obtain a new access token. This token
     * was issued during the initial authentication (/auth/moderator/login)
     * and must be valid and not expired.
     *
     * This refresh token must be a JWT that is currently active and
     * unrevoked. The system validates the refresh token against the token
     * store and ensures that the associated moderator account referenced in
     * the token payload exists and is not soft-deleted (id must correspond
     * to a discussion_board_moderators record where deleted_at is null).
     * Additionally, the refresh token must be linked to an active entry in
     * the discussion_board_moderator_sessions table, indicating that the
     * original session has not been terminated. This function will fail if
     * any of these conditions are not met.
     */
    refresh_token: string;
  };

  /**
   * Request body containing the moderator's email and password to
   * authenticate and generate access tokens.
   *
   * This schema defines the data required for moderator authentication. The
   * email must exactly match an existing record in the
   * discussion_board_moderators table and must have email_verified set to
   * true. The password will be verified against the stored password_hash.
   *
   * This operation is a self-login (authorizationActor: "moderator"), meaning
   * the authenticated actor is themselves establishing their session.
   * Therefore, session context fields MUST be included:
   *
   * - Ip: Client IP address (optional - server can extract from request)
   * - Href: Current page URL (mandatory)
   * - Referrer: Previous page URL (mandatory)
   *
   * These session fields are written to the
   * discussion_board_moderator_sessions table upon successful authentication.
   * They are not authentication fields but rather connection metadata for
   * audit and security purposes.
   *
   * No owner, creator, or update fields are included because the system
   * automatically associates the session with the authenticated moderator
   * through JWT validation.
   */
  export type IRequest = string;
}
