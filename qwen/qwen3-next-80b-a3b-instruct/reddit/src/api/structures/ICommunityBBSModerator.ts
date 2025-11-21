import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityBBSModerator {
  /**
   * Authentication credentials required to authenticate a moderator user.
   *
   * This schema defines the input structure for moderator login operations in
   * the communityBBS authentication system. It requests the moderator's email
   * address and password (in plaintext for server-side verification) to
   * establish a secure session.
   *
   * The IP address is collected from the client when the login request is
   * made, following SSR (Server-Side Rendering) design patterns where the
   * client can provide the originating IP for enhanced security analysis. The
   * href and referrer fields capture the web context of the login attempt,
   * enabling behavioral auditing and security monitoring.
   *
   * Security Principle: The password field receives plain text because
   * server-side systems use strong cryptographic hashing (BCrypt) to compare
   * against the stored password_hash in the community_bbs_moderator table.
   * Clients never transmit pre-hashed passwords - hash computation is server
   * responsibility.
   *
   * All fields are required to ensure complete security context is captured
   * during authentication. The system validates email format, password
   * length, and session metadata for comprehensive account protection.
   *
   * ## Business Context
   *
   * This login flow is critical for maintaining accountability and security
   * in the moderation ecosystem of communityBBS. Moderators have elevated
   * privileges including content review, hiding, or removal capabilities.
   * Secure authentication prevents unauthorized access to sensitive
   * moderation functions.
   *
   * ## Validation Rules
   *
   * - Email: Must follow RFC 5322 email format standards and be
   *   case-insensitive during matching
   * - Password: Must be between 8 and 128 characters long
   * - Ip: Must be a valid IPv4 or IPv6 address when provided
   * - Href: Must be a valid URI as defined in RFC 3986
   * - Referrer: Must be a valid URI as defined in RFC 3986
   *
   * ## Usage Example
   *
   * ```json
   * {
   *   "email": "moderator@communitybbs.example.com",
   *   "password": "SecurePass123!",
   *   "ip": "192.168.1.100",
   *   "href": "https://communitybbs.example.com/login",
   *   "referrer": "https://communitybbs.example.com/"
   * }
   * ```
   *
   * ## Related Entities
   *
   * This schema directly corresponds to the `community_bbs_moderator` Prisma
   * model, which contains the `email` and `password_hash` fields used for
   * authentication.
   *
   * ## Security Implications
   *
   * The client transmits plain text because server-side systems handle
   * cryptographic hashing (BCrypt) for password comparison. This approach
   * allows the server to validate password complexity rules before hashing.
   *
   * ## Session Context
   *
   * The ip, href, and referrer fields provide complete session context for
   * security auditing and behavioral analysis, helping identify phishing
   * attempts and suspicious login patterns.
   */
  export type ICreate = string;

  /**
   * Authentication tokens and user identity data returned upon successful
   * moderator authentication.
   *
   * This schema defines the structure of the successful authentication
   * response for moderator login or refresh operations. It includes the
   * essential authentication tokens and identity information for the
   * authenticated moderator.
   *
   * The response contains a JWT access token for subsequent API requests and
   * the unique identifier of the moderator. The system ensures that the
   * moderator's identity cannot be manipulated by the client, as all
   * security-critical fields are generated server-side from the authenticated
   * session.
   *
   * The token field is a JWT that includes claims about the moderator
   * identity (id), expiration time, and issuer. The server will use this
   * token to verify authority in subsequent requests.
   *
   * Important security consideration: This response structure deliberately
   * excludes any sensitive information such as hash values, passwords,
   * tokens, secrets, or any information that could be exploited by attackers
   * if leaked. Only the authenticated identity and token are returned.
   *
   * The id field is formatted as a UUID to ensure uniqueness and is derived
   * from the community_bbs_moderator record in the database.
   *
   * This approach follows security best practices where only minimal
   * essential information is returned in successful authentication responses,
   * minimizing the attack surface.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated moderator.
     *
     * This UUID is retrieved from the community_bbs_moderator table and
     * represents the moderator's persistent identity within the system.
     *
     * The id is automatically generated by the server using the
     * authenticated session context, and cannot be manipulated by client
     * requests. This ensures account integrity and prevents identity
     * spoofing.
     *
     * Used for auditing, tracking moderator actions, and authorization
     * decisions in subsequent API requests.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Authentication credentials required to authenticate a moderator user.
   *
   * This schema defines the input structure for moderator login operations in
   * the communityBBS authentication system. It requests the moderator's email
   * address and password (in plaintext for server-side verification) to
   * establish a secure session.
   *
   * All fields are required to ensure complete security context is captured
   * during authentication. The system validates email format, password
   * length, and session metadata for comprehensive account protection.
   *
   * ## Business Context
   *
   * This login flow is critical for maintaining accountability and security
   * in the moderation ecosystem of communityBBS. Moderators have elevated
   * privileges including content review, hiding, or removal capabilities.
   * Secure authentication prevents unauthorized access to sensitive
   * moderation functions.
   *
   * ## Validation Rules
   *
   * - Email: Must follow RFC 5322 email format standards and be
   *   case-insensitive during matching
   * - Password: Must be between 8 and 128 characters long
   *
   * ## Usage Example
   *
   * ```json
   * {
   *   "email": "moderator@communitybbs.example.com",
   *   "password": "SecurePass123!"
   * }
   * ```
   *
   * ## Related Entities
   *
   * This schema directly corresponds to the `community_bbs_moderator` Prisma
   * model, which contains the `email` and `password_hash` fields used for
   * authentication.
   *
   * ## Security Implications
   *
   * The client transmits plain text because server-side systems handle
   * cryptographic hashing (BCrypt) for password comparison. This approach
   * allows the server to validate password complexity rules before hashing.
   *
   * ## Session Context
   *
   * The ip, href, and referrer fields provide complete session context for
   * security auditing and behavioral analysis, helping identify phishing
   * attempts and suspicious login patterns.
   */
  export type ILogin = {
    /**
     * Moderator's email address for authentication.
     *
     * This field is used to uniquely identify the moderator account in the
     * community_bbs_moderator table. The email must be case-insensitive
     * during validation and match the registered moderator's persistent
     * email address.
     *
     * The system enforces RFC 5322 email format standards for valid email
     * syntax.
     *
     * ## Business Context
     *
     * This is the primary identifier for moderator authentication. Each
     * moderator account is uniquely associated with one email address that
     * serves as their login credential.
     *
     * ## Validation Rules
     *
     * - Must be a valid email address according to RFC 5322 standards
     * - Must be between 5 and 254 characters long
     * - Must not contain non-ASCII characters
     * - Must be unique across all moderator accounts
     *
     * ## Usage Example
     *
     * ```json
     * {
     *   "email": "moderator@communitybbs.example.com"
     * }
     * ```
     *
     * ## Related Entities
     *
     * This field directly corresponds to the `email` field in the
     * community_bbs_moderator Prisma model.
     *
     * ## Security Implications
     *
     * The email field is transmitted in plain text during login requests
     * because it's necessary for the server to look up the moderator's
     * account. However, the server never stores the plain text email in
     * logs or audit trails - it's only used for account lookup, then
     * discarded after authentication.
     *
     * ## Error Handling
     *
     * - Invalid email format: Returns 400 Bad Request
     * - Non-existent email: Returns 401 Unauthorized
     * - Missing email: Returns 400 Bad Request
     */
    email: string;

    /**
     * Plain text password for authenticating the moderator.
     *
     * The system receives the password in plain text for server-side BCrypt
     * hashing and comparison with the stored password_hash in the
     * community_bbs_moderator table.
     *
     * This approach allows server-side validation of password complexity
     * rules before hashing.
     *
     * ## Business Context
     *
     * This is the secret credential that proves the moderator's identity.
     * The system never stores plain text passwords - it only stores the
     * BCrypt hash.
     *
     * ## Validation Rules
     *
     * - Must be between 8 and 128 characters long
     * - Must contain at least one uppercase letter
     * - Must contain at least one lowercase letter
     * - Must contain at least one number
     * - Must contain at least one special character
     * - Must not contain the moderator's email address
     * - Must not be a commonly used password
     * - Must not have been used previously by this moderator
     *
     * ## Usage Example
     *
     * ```json
     * {
     *   "password": "SecurePass123!"
     * }
     * ```
     *
     * ## Related Entities
     *
     * This field is used to verify against the `password_hash` field in the
     * community_bbs_moderator Prisma model.
     *
     * ## Security Implications
     *
     * The client transmits plain text password because the server performs
     * cryptographic hashing (BCrypt) for security. This allows the server
     * to validate password complexity before hashing.
     *
     * ## Error Handling
     *
     * - Password too short: Returns 400 Bad Request
     * - Password too long: Returns 400 Bad Request
     * - Password format invalid: Returns 400 Bad Request
     * - Invalid credentials: Returns 401 Unauthorized
     */
    password: string;
  };

  /**
   * Refresh token used to renew an expired access token for a moderator
   * session.
   *
   * This schema defines the input structure required to refresh a moderator's
   * authentication token after expiration. The refresh token is a long-lived
   * token issued during initial login that permits generation of new,
   * short-lived access tokens without requiring re-authentication with email
   * and password.
   *
   * The refresh token is bound to a specific session in the
   * community_bbs_moderator_sessions table and must not be expired.
   *
   * Security Principle: Refresh tokens are stored securely and have longer
   * expiration lifetime than access tokens, reducing frequency of sensitive
   * credential entry while maintaining session continuity.
   *
   * Note: The system is designed to expose only refresh token as the minimum
   * required credential for token renewal, avoiding exposure of moderator
   * credentials on every request.
   *
   * ## Business Context
   *
   * This refresh mechanism is essential for providing a seamless
   * authentication experience while maintaining strict security protocols for
   * moderator accounts in the communityBBS system. Moderators often need
   * extended access to perform continuous moderation tasks, and requiring
   * re-authentication for every session expiration would significantly reduce
   * efficiency.
   *
   * ## Validation Rules
   *
   * - Refresh_token: Must be a valid Base64-encoded JWT containing session
   *   identifier and expiration metadata
   * - Refresh_token: Must not be expired according to the expired_at field in
   *   the community_bbs_moderator_sessions table
   * - Refresh_token: Must be transmitted over HTTPS connections only
   * - Refresh_token: Must be properly secured on client side (e.g., HTTP-only
   *   cookie with secure flags)
   *
   * ## Usage Example
   *
   * ```json
   * {
   *   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2RlcmF0b3JAZW1haWwuZXhhbXBsZS5jb20iLCJpYXQiOjE2OTg3NjU0MjIsImV4cCI6MTY5ODg1MTgyMiwiaXNzIjoiY29tbXVuaXR5QkJTIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
   * }
   * ```
   *
   * ## Related Entities
   *
   * This schema directly corresponds to the
   * `community_bbs_moderator_sessions` Prisma model, which stores the refresh
   * token and its expiration metadata.
   *
   * ## Security Implications
   *
   * The refresh token has a longer expiration lifetime than the access token,
   * allowing users to maintain their session without frequent credential
   * entry. However, it is designed to be securely stored and only used for
   * token renewal, not for other API requests.
   *
   * ## Token Lifecycle
   *
   * 1. Initial login generates both access_token and refresh_token
   * 2. Access_token expires after short period (15-30 minutes)
   * 3. Refresh_token used to obtain new access_token before expiration
   * 4. Refresh_token expires after longer period (7-30 days)
   * 5. When refresh_token expires, user must re-authenticate with email and
   *    password
   *
   * ## Client Storage Requirements
   *
   * - Refresh_token must be stored securely, preferably in an HTTP-only cookie
   *   with SameSite=Strict
   * - Never store in localStorage or sessionStorage
   * - Must be transmitted only over HTTPS connections
   * - Must be invalidated on logout and session expiry
   *
   * ## Error Handling
   *
   * - Invalid refresh_token: Returns 401 Unauthorized
   * - Expired refresh_token: Returns 401 Unauthorized
   * - Malformed refresh_token: Returns 400 Bad Request
   * - No refresh_token provided: Returns 400 Bad Request
   */
  export type IRefresh = string;
}
