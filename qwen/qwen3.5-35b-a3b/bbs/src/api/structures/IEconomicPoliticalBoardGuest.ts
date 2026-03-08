import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicPoliticalBoardGuest {
  /**
   * Authorization response returned after guest user registration or token refresh. Contains the authenticated user's unique identifier and a complete set of authentication tokens (access token and refresh token) required for making authenticated API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated user extracted from JWT payload.
     *
     * @x-autobe-specification Extracted from the authenticated user's JWT payload (user_id claim) during registration or login. This is the UUID of the user record in economic_political_board_administrator_roles table. Computed value, not directly stored in this DTO.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;

    /**
     * UTC datetime timestamp when the access token expires. After this time, the access token will be rejected by authenticated endpoints.
     *
     * @x-autobe-specification Computed timestamp: current UTC time + access token TTL (typically 15 minutes). This timestamp is also embedded within the JWT itself as the 'exp' claim. Clients should proactively refresh before this time to maintain seamless user experience.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Request payload for renewing an authentication access token using a refresh token. Submit your valid refresh token to receive a new access token without re-authenticating. The refresh token should have been issued during your initial login and must be stored securely on the client side and transmitted only over HTTPS. If the refresh token is invalid, expired, or the user account has been banned, the refresh request will fail.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for obtaining new access tokens. This long-lived token (typically 7 days) allows maintaining authenticated sessions without re-entering credentials. Store securely and transmit only over HTTPS.
     *
     * @x-autobe-specification JWT refresh token string issued during authentication (POST /auth/guest/join). Server validates token signature, expiration, and user account status. Token rotation pattern: on successful refresh, may issue new refresh token with extended refreshable_until deadline. Must be stored securely client-side, transmitted only over HTTPS.
     */
    refresh_token: string;
  };

  /**
   * Request body for guest user registration in the Economic/Political Discussion Board. Captures credentials and contextual information needed to create a new user account. The email serves as unique identifier for authentication. Password will be hashed with bcrypt. An optional display name can be provided; if not specified, system generates default from email prefix. Session context (href, referrer) is REQUIRED to track registration origin for security and analytics.
   */
  export type IJoin = {
    /**
     * User's unique email address for authentication and account identification. Must be a valid email format and not already registered.
     *
     * @x-autobe-specification User email address for authentication. Unique constraint enforced at database level. Email format validation required. Backend stores in User.email field after registration.
     */
    email: string & tags.Format<"email">;

    /**
     * User's account password. Minimum 8 characters required. Will be hashed using bcrypt before storage. Do not send plain text passwords.
     *
     * @x-autobe-specification User's account password. Minimum 8 characters required. Backend hashes using bcrypt before storing in User.password_hashed field. Password is never stored in plain text.
     */
    password: string & tags.MinLength<8>;

    /**
     * Public display name shown on profile. Optional - if not provided, system generates default from email prefix.
     *
     * @x-autobe-specification Public display name shown on profile. Optional - backend creates Profile record with this value or generates default from email prefix if not provided. Maximum 50 characters.
     */
    displayName?: (string & tags.MaxLength<50>) | null | undefined;

    /**
     * The URL of the page where registration was initiated. Required for guest registration to track origin for security and analytics purposes.
     *
     * @x-autobe-specification Session context from request. Captures the URL of the page where registration was initiated. Used for tracking registration origin and security audit. Computed from request headers, stored in session table. Not a database column in User or Profile tables.
     */
    href: string & tags.Format<"uri">;

    /**
     * The URL that referred the user to the registration page. Required for guest registration to track origin and analytics.
     *
     * @x-autobe-specification Session context from request headers. Captures the referring URL (where user came from before registration page). Used for tracking acquisition sources and security audit. Computed from request headers, stored in session table. Not a database column in User or Profile tables.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * User's IP address. Optional for guest registration because in SSR the server captures it directly. Format: IPv4 address.
     *
     * @x-autobe-specification Session context from request. Optional for guest registration because in SSR (Server Side Rendering) the client cannot know its own IP — server captures it as fallback. Format: IPv4 address. Stored in session table, not in User or Profile tables.
     */
    ip: string & tags.Format<"ipv4">;
  };
}
