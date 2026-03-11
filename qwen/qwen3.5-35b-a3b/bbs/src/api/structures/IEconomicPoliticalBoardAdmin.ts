import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicPoliticalBoardAdmin {
  /**
   * Authentication response containing the admin user identifier and JWT tokens for API access.
   *
   * This response is returned by all authentication endpoints (registration, login, and token refresh) and provides the credentials needed to access protected API endpoints. The id field identifies the authenticated admin user, while the token field contains the complete authorization token structure including access and refresh tokens with their expiration timestamps.
   *
   * Security considerations: The access token is short-lived (15 minutes) to minimize exposure if intercepted. The refresh token allows session continuation for up to 7 days. Clients should store tokens securely (e.g., httpOnly cookies or secure storage) and proactively refresh tokens before expiration to maintain seamless access.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated admin user.
     *
     * @x-autobe-specification Authenticated user's unique identifier. Extracted from JWT claims after successful credential validation. Corresponds to the user_id field in the economic_political_board_administrator_roles table (which references the User table). The ID is included in the JWT payload and decoded to populate this response field.
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
   * Request body for admin authentication endpoint. Contains credentials (email and password) to verify admin identity and obtain access tokens.
   */
  export type ILogin = {
    /**
     * User's email address used for authentication.
     *
     * @x-autobe-specification Direct mapping from User.email for authentication lookup. The email is used to query the User table to retrieve the corresponding passwordHash for comparison.
     */
    email: string & tags.Format<"email">;

    /**
     * User's account password for authentication.
     *
     * @x-autobe-specification Mapped from User.password_hashed via bcrypt/Argon2 verification. Client provides plaintext password which is hashed and compared against the stored passwordHash.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Request body for refreshing authentication tokens. Contains the refresh token required to obtain new access and refresh tokens without re-entering credentials.
   */
  export type IRefresh = {
    /**
     * Refresh token for obtaining new access and refresh tokens without re-authentication.
     *
     * @x-autobe-specification JWT refresh token string. Service layer validates signature, expiration, and revocation status against database. New refresh token issued with 7-day expiration on successful validation.
     */
    refresh: string;
  };

  /**
   * Request body for creating a new administrator account on the Economic/Political Discussion Board. Provides authentication credentials (email, password) and profile information (display name, bio) during registration. Session tracking fields (referrer, href) record the registration source for audit purposes. The system validates email uniqueness and format, hashes the password securely, and creates both a User account and linked Profile record upon successful registration. Returns JWT tokens for immediate authentication.
   */
  export type IJoin = {
    /**
     * Unique email address for the administrator account. Used for authentication and account identification.
     *
     * @x-autobe-specification User email address for authentication. Backend stores in User.email with unique constraint. Service validates RFC 5322 format and checks uniqueness against existing User records before insertion. Throws validation error if email already exists.
     */
    email: string & tags.Format<"email">;

    /**
     * Secure password for authentication. Stored as hashed value in the database. Minimum 8 characters with complexity requirements.
     *
     * @x-autobe-specification Plain text password provided by user. Backend transforms using bcrypt or Argon2 hashing algorithm before storing in User.password_hashed field. Service enforces minimum 8 characters and complexity requirements (uppercase, lowercase, number, special character). Password is never stored or logged in plain text.
     */
    password: string & tags.Format<"password">;

    /**
     * Public display name shown on the administrator's profile. Required field for profile creation.
     *
     * @x-autobe-specification Public display name for Profile record. Required field. Service creates Profile record with this displayName upon user registration. Stored in Profile.displayName column. Can be updated later via Profile update API.
     */
    displayName: string & tags.MinLength<1>;

    /**
     * Optional biography text describing the administrator. Can be empty or contain personal/professional information.
     *
     * @x-autobe-specification Optional biography text for Profile record. Service creates Profile record with bio field (can be empty string). Stored in Profile.bio column. Can be updated later via Profile update API. No length restrictions enforced at DTO level.
     */
    bio?: string | undefined;

    /**
     * URL of the page from which the registration was initiated. Used for audit and tracking registration source.
     *
     * @x-autobe-specification Session context field recording the registration source URL. Captured from HTTP Referer header or frontend-provided value. Stored in session tracking table for audit purposes. Not mapped to any single database table; tracked separately. Format: URI.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referring URL that led to the registration page. Helps track registration sources and user journey.
     *
     * @x-autobe-specification Session context field recording the referring page or traffic source. Captured from HTTP Referer header or frontend-provided referrer parameter. Stored in session tracking table for analytics and security audit. Format: URI.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address captured during registration for audit purposes. Used to track registration location and detect abuse patterns.
     *
     * @x-autobe-specification Client IP address captured during registration. Optional in request body (can be null if server-side rendering provides fallback from request object). Service layer always captures IP from request headers. Stored in session tracking table. Format: IPv4 address (e.g., '192.168.1.1'). Used for location tracking, abuse detection, and security auditing.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
