import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicPoliticalBoardMember {
  /**
   * Authorization response containing user identification and JWT tokens for API authentication.
   *
   * This response type is returned after successful member authentication operations including registration, login, and token refresh. It provides the user ID for client-side identification and a complete token object with access and refresh tokens along with their expiration timestamps.
   *
   * The access token must be included in the Authorization header using the Bearer scheme for all authenticated API requests. The refresh token enables obtaining new access tokens without re-authentication, maintaining seamless user sessions. Expiration timestamps help clients manage token renewal proactively.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user.
     *
     * @x-autobe-specification User ID from JWT access token payload (economic_political_board_users.id). Extracted during authentication and embedded in JWT claims for stateless client identification. Used for client-side user identification and JWT claim validation. Data source: economic_political_board_users table (not in available schemas), retrieved during login/registration.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Registration request body for creating a new member account on the Economic Political Board discussion platform.
   *
   * This DTO contains the required authentication credentials (email and password) and profile information (displayName and bio) for new member registration. The password is provided as plain text and will be securely hashed by the backend before storage. Session context information (source URL, referrer, and IP address) is included for tracking the registration source and enhancing security audit trails.
   */
  export type IJoin = {
    /**
     * User's email address used for authentication and account identification.
     *
     * @x-autobe-specification Maps to economic_political_board_users.email column. Must be unique across all users. Validation: RFC 5322 email format, uniqueness check against existing users before account creation.
     */
    email: string & tags.Format<"email">;

    /**
     * User's account password for authentication. Stored as hashed value for security.
     *
     * @x-autobe-specification User-provided plain text password. Backend transforms: bcrypt or Argon2 hashing algorithm with salt, stored as passwordHashed in economic_political_board_users.passwordHashed column. Validation: minimum length (enforced by business rules), no plain text storage.
     */
    password: string & tags.Format<"password">;

    /**
     * User's public display name shown in profile and on posts.
     *
     * @x-autobe-specification Maps to economic_political_board_profiles.displayName column. Unique constraint enforced. Validation: minimum and maximum length per business rules, uniqueness check against existing profiles, no impersonation patterns.
     */
    displayName: string;

    /**
     * User's short biographical description shown on their profile page.
     *
     * @x-autobe-specification Maps to economic_political_board_profiles.bio column. Optional field. Validation: maximum length limit, no prohibited content (contact info, spam). Empty bio allowed.
     */
    bio?: string | undefined;

    /**
     * The URL or page that redirected the user to the registration form.
     *
     * @x-autobe-specification Source URL of registration request. Not stored in user/profile tables. Tracked separately for session/audit purposes. Captures the page or link that led user to registration. Optional in SSR scenarios where client may not know source URL.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referring website or page that sent the user to register.
     *
     * @x-autobe-specification HTTP Referrer header value from registration request. Not stored in user/profile tables. Tracked separately for session/audit purposes. Helps identify marketing campaigns, entry points, or suspicious registration patterns. Optional in SSR scenarios.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * User's IP address during registration. Used for security tracking and rate limiting.
     *
     * @x-autobe-specification Client IP address from registration request. Not stored in user/profile tables. Tracked separately for session/audit purposes. Format: IPv4 (or IPv6 if supported). Used for rate limiting, fraud detection, and security monitoring. Optional in SSR where server captures IP instead.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for member authentication. Provides email and password credentials to authenticate a registered member account. The system validates the credentials against stored user data, checks if the account has been banned, and issues JWT access and refresh tokens upon successful authentication.
   */
  export type ILogin = {
    /**
     * User's registered email address used as the primary identifier for authentication.
     *
     * @x-autobe-specification Email is used to query the economic_political_board_users table by email column. Input validation ensures standard email format. The email must match a registered account; if no matching user exists, authentication fails with 401 Unauthorized.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password (provided in plaintext, will be hashed for verification).
     *
     * @x-autobe-specification Password is received as plaintext from the client, then hashed using the same algorithm (bcrypt or Argon2) used during registration. The hashed value is compared with the stored passwordHash in the economic_political_board_users table using constant-time comparison to prevent timing attacks. Security: rate limiting applies to prevent brute-force attacks. The original plaintext password is never stored.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Request body for renewing a JWT access token using a refresh token.
   *
   * Contains the refresh token that was issued during member registration or login. This long-lived token can be exchanged for a new short-lived access token, allowing session continuation without re-entering credentials. The refresh token is validated against a server-side token store that tracks token rotation and revocation for security.
   */
  export type IRefresh = {
    /**
     * Refresh token for renewal.
     *
     * The long-lived authentication token issued during registration or login that can be exchanged for a new access token. This token enables seamless session continuation without requiring the user to re-authenticate with credentials. Stored securely and transmitted only to the token refresh endpoint.
     *
     * @x-autobe-specification JWT refresh token string issued during registration/login (typically 1-30 days validity). Format: JWT (three Base64URL-encoded parts: header.payload.signature). Validation requires: 1) JWT structure verification, 2) Signature verification using issuer's public key, 3) Expiration check (exp claim), 4) Server-side token store lookup by userId for token existence and revocation status. The token is NOT stored as a database column but in the server-side refresh token store (economic_political_board_refresh_tokens). On successful renewal: old token is revoked and a new refresh token is issued (token rotation).
     */
    refreshToken: string;
  };

  /**
   * Lightweight member summary entity for API responses, containing user identification (id, email) and profile information (displayName, bio). This DTO provides minimal member metadata for display purposes in article listings, comment threads, and administrative role displays, while intentionally excluding sensitive data such as password hashes, ban status, and administrative timestamps.
   */
  export type ISummary = {
    /**
     * Unique identifier of the member (UUID format).
     *
     * @x-autobe-specification Mapped from user.id in the User table joined with Profile table on user.id = profile.userId. UUID format from primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Member's email address used for authentication and identification.
     *
     * @x-autobe-specification Mapped from user.email in the User table joined with Profile table on user.id = profile.userId. Email format string.
     */
    email: string & tags.Format<"email">;

    /**
     * Member's display name shown in community interactions and profile views.
     *
     * @x-autobe-specification Mapped from profile.displayName in the Profile table joined with User table on user.id = profile.userId. String field for display purposes.
     */
    displayName: string;

    /**
     * Member's bio or about text displayed on their profile page.
     *
     * @x-autobe-specification Mapped from profile.bio in the Profile table joined with User table on user.id = profile.userId. Text field for user biography.
     */
    bio: string;
  };
}
