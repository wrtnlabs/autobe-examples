import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Guest authentication response containing the guest identifier and JWT tokens.
   *
   * This type represents a successful guest authentication result, returned after guest registration or token refresh operations. The guest id identifies the authenticated guest account, while the token object contains the JWT credentials needed for subsequent authenticated requests.
   *
   * The access token is used for API authentication and has a short lifetime for security. The refresh token allows obtaining new access tokens without re-registration. The expired_at timestamp indicates when the access token expires.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated guest account.
     *
     * This UUID identifies the guest account in the system. It is used to associate the guest with their sessions and todos. The id is auto-generated when the guest account is created and remains constant throughout the account's lifetime.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from todo_app_guests.id. UUID
         *   format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
         * @x-autobe-specification Authorization token comes from the session
         *   table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request payload for guest account registration using device fingerprint.
   *
   * Contains the unique device fingerprint that identifies the guest account, generated from browser or device characteristics. This fingerprint must be unique across all guest accounts and serves as the primary identifier for anonymous users.
   *
   * Session context fields capture the registration environment for audit and security purposes. The href represents the current page URL where registration occurred, referrer indicates the previous page that navigated to registration, and ip records the client's IP address when available (optional for SSR scenarios where the server captures it).
   */
  export type IJoin = {
    /**
     * Unique device identifier for guest account recognition.
     *
     * Generated from browser or device characteristics to identify anonymous users. This fingerprint is used to associate guest sessions and guest-owned todos with the correct guest account. Must be unique across all guest accounts.
     *
     * The fingerprint should be consistent across browser sessions for the same device to maintain guest identity. Common techniques include combining browser metadata, screen resolution, installed fonts, and other device characteristics.
     *
         * @x-autobe-database-schema-property device_fingerprint
         * @x-autobe-specification Direct mapping to
         *   todo_app_guests.device_fingerprint. Must be unique across all guest
         *   accounts. Generated from browser or device characteristics.
     */
    device_fingerprint: string;

    /**
     * Current page URL where guest registration occurred.
     *
     * Captured from the browser's location.href at the time of registration. This URL represents the exact page where the user initiated the guest account creation process.
     *
     * Used for audit trails and security analysis to understand user behavior patterns. Also helps in redirecting users back to their intended destination after successful registration.
     *
         * @x-autobe-specification Session context field captured from HTTP
         *   request. Represents the current page URL where registration
         *   occurred. Stored in todo_app_guest_sessions metadata, not in
         *   todo_app_guests directly.
     */
    href: string & tags.Format<"uri">;

    /**
     * Previous page URL that navigated to the registration page.
     *
     * Captured from the HTTP Referrer header or document.referrer in the browser. Indicates where the user came from before landing on the registration page.
     *
     * Useful for understanding user acquisition sources and navigation flows. May be empty if the user typed the URL directly or if privacy settings block referrer information.
     *
         * @x-autobe-specification Session context field captured from HTTP
         *   request. Represents the previous page URL that navigated to
         *   registration. Stored in todo_app_guest_sessions metadata.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address at time of registration.
     *
     * Optional field because in Server-Side Rendering (SSR) scenarios, the client cannot reliably determine its own IP address. The server captures the IP from the HTTP request and uses it as a fallback when not provided.
     *
     * Used for security monitoring, fraud detection, and audit trails. The IP address helps identify suspicious registration patterns and provides geographic context for the guest session.
     *
         * @x-autobe-specification Session context field captured from HTTP
         *   request. Client IP address, optional because in SSR the server
         *   captures it as fallback. Stored in todo_app_guest_sessions
         *   metadata. Format: IPv4.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for refreshing guest authentication tokens.
   *
   * Contains the refresh token to exchange for new credentials and session context information for audit purposes. The refresh token must be valid and unexpired.
   *
   * Session context fields (href, referrer, ip) track where the refresh request originated from for security monitoring. The ip field is optional as it may be captured server-side in SSR contexts.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for obtaining new access credentials.
     *
     * A long-lived token that was issued during guest registration or a previous refresh operation. This token is exchanged for a new access token and refresh token pair.
     *
     * The token must be valid, unexpired, and correspond to an active session in the database. Invalid or expired tokens result in authentication failure with a 401 response.
     *
         * @x-autobe-specification JWT refresh token string validated against
         *   todo_app_guest_sessions. Token is decoded to extract session ID,
         *   then session is looked up in database. Token must not be expired.
         *   Not a direct DB column - token is cryptographic credential that
         *   references a session record.
     */
    refresh_token: string;

    /**
     * URL path where the refresh request was initiated.
     *
     * Tracks the entry point for audit and analytics purposes. This helps identify where in the application the token refresh was triggered.
     *
     * Format: URI string (e.g., '/dashboard', '/settings/profile').
     *
         * @x-autobe-database-schema-property href
         * @x-autobe-specification Direct mapping from
         *   todo_app_guest_sessions.href. Captures the URL path where the
         *   refresh request originated. Used for security audit and session
         *   tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led to the refresh request.
     *
     * Tracks the traffic source for analytics and security monitoring. This field can be empty if the request was made via direct access (no referrer).
     *
     * Format: URI string (e.g., 'https://example.com/dashboard').
     *
         * @x-autobe-database-schema-property referrer
         * @x-autobe-specification Direct mapping from
         *   todo_app_guest_sessions.referrer. Captures the referrer URL that
         *   led to the refresh request. Can be empty for direct access.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * IP address of the client making the refresh request.
     *
     * Used for security audit and session validation. Helps detect suspicious activity such as token usage from unexpected locations.
     *
     * This field is optional in the request body because in server-side rendering (SSR) contexts, the client may not know its own IP address. The server captures the IP as a fallback when not provided.
     *
     * Format: IPv4 address string (e.g., '192.168.1.1').
     *
         * @x-autobe-database-schema-property ip
         * @x-autobe-specification Direct mapping from
         *   todo_app_guest_sessions.ip. Client IP address for security audit.
         *   Optional in request body as server may capture it as fallback
         *   (body.ip ?? serverIp) in SSR contexts.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
