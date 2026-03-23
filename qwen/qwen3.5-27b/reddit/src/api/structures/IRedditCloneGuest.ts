import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCloneGuest {
  /**
   * Authorization response for guest authentication containing the guest identifier and JWT authentication tokens. This response is returned after successful guest registration or token refresh, providing the credentials needed for subsequent authenticated API requests. The id uniquely identifies the guest account, while the token object contains short-lived access token for API authentication and long-lived refresh token for session renewal without re-registration.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account. This UUID is used to identify the guest across API requests and corresponds to the guest record in the reddit_clone_guests table.
     *
     * @x-autobe-specification Computed from reddit_clone_guests.id column. After successful guest registration or token refresh, the guest's UUID is retrieved from the database and returned to the client as part of the authorization response for tracking purposes.
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
   * Request body for guest registration. Creates a temporary guest account identified by device fingerprint for anonymous browsing access. Includes device identification information (fingerprint, IP, user agent) and session context (referrer URL, current page) for tracking connection metadata. Guests have read-only access to public content including popular feeds, community feeds, and search results. This DTO is idempotent - duplicate device fingerprints return the existing guest.
   */
  export type IJoin = {
    /**
     * Unique device identifier generated from browser and device characteristics for guest identification. This fingerprint enables the system to maintain session state for anonymous users while respecting privacy. Duplicate fingerprints return the existing guest account.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from reddit_clone_guests.device_fingerprint. Unique constraint enforced by database. Generated from browser/device characteristics for guest identification. Backend checks uniqueness - returns existing guest if found, creates new if not.
     */
    device_fingerprint: string;

    /**
     * IP address of the guest's device at account creation. Used for tracking connection metadata and abuse prevention purposes.
     *
     * @x-autobe-database-schema-property ip_address
     * @x-autobe-specification Direct mapping from reddit_clone_guests.ip_address. Captured from HTTP request at registration time. Used for tracking and abuse prevention.
     */
    ip_address: string;

    /**
     * Browser user agent string captured at registration. Used for device and browser identification, analytics, and compatibility tracking.
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Direct mapping from reddit_clone_guests.user_agent. Captured from HTTP request headers. Used for device and browser identification.
     */
    user_agent: string;

    /**
     * Current page URL where the guest registration occurred. Used for session tracking and analytics. Stored in the guest session table, not the guest account table.
     *
     * @x-autobe-specification Session context field NOT stored in reddit_clone_guests table. Used to create corresponding entry in reddit_clone_guest_sessions table. Captured from current page URL at registration time.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led the user to the current page. Used for tracking user acquisition sources and session context. Stored in the guest session table, not the guest account table.
     *
     * @x-autobe-specification Session context field NOT stored in reddit_clone_guests table. Used to create corresponding entry in reddit_clone_guest_sessions table. Captured from HTTP Referer header at registration time.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for the current request. Optional field that allows clients to explicitly provide their IP, but server will capture it automatically as fallback in SSR scenarios. Stored in the guest session table, not the guest account table.
     *
     * @x-autobe-specification Session context field NOT stored in reddit_clone_guests table. Used to create corresponding entry in reddit_clone_guest_sessions table. Optional field for SSR scenarios where client cannot know its own IP - server captures it as fallback (body.ip ?? serverIp).
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for refreshing guest authentication tokens. Contains the refresh token used to validate and extend an existing guest browsing session. The refresh token is validated against the guest sessions table to ensure the session is still active and not expired. Upon successful validation, new access and refresh tokens are generated to allow the guest to continue browsing public content without interruption.
   */
  export type IRefresh = {
    /**
     * Long-lived refresh token for obtaining new access tokens. Used to request new access tokens when the current access token expires, allowing session continuation without re-authentication. Should be stored securely and transmitted only to the token refresh endpoint.
     *
     * @x-autobe-specification Authentication token string that must be validated against the reddit_clone_guest_sessions.refresh_token column. The backend queries this table to verify: 1) token exists, 2) expired_at timestamp is in the future, 3) session belongs to a valid guest. If valid, new tokens are generated and a new session record is created.
     */
    refresh_token: string;
  };
}
