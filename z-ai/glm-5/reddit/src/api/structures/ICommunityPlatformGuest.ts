import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuest {
  /**
   * Request body for refreshing an expired guest session token.
   *
   * Guests use this endpoint to obtain a new access token and refresh token pair when their current access token expires. The refresh token is validated against session records to ensure it hasn't been revoked or expired. Optional session context (href, referrer, ip) updates tracking information for analytics.
   */
  export type IRefresh = {
    /**
     * The refresh token issued during guest account creation or previous refresh. Used to validate the session and issue new tokens.
     *
     * @x-autobe-specification JWT refresh token string validated against community_platform_guest_sessions.refresh_token column. Extract guest_id from token claims. Token must be valid, not revoked, and within refreshable window. Used for token rotation on successful validation.
     */
    refresh_token: string;
  };

  /**
   * Authorization response for guest accounts containing the guest's unique identifier and JWT token pair for API authentication.
   *
   * This response is returned when a guest account is created or when session tokens are refreshed. The id allows the client to identify the guest session, while the token provides credentials for authenticating subsequent API requests. The access token is used for API authentication, and the refresh token enables obtaining new tokens without creating a new guest account.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account. Used to associate browsing activity and sessions with the guest visitor.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_guests.id. UUID primary key generated when the guest account is created.
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
   * Request body for creating a temporary guest account to browse the community platform.
   *
   * Guest accounts are transient visitors who can explore content without providing credentials. Unlike member registration, no email, password, or username is required. The request captures only session context for tracking and security purposes.
   *
   * Upon successful creation, the guest receives access and refresh tokens that establish their browsing session, enabling access to Popular Feeds, Community Feeds, posts, and comments.
   */
  export type IJoin = {
    /**
     * Current page URL where the guest is initiating the join request. Used for session tracking and analytics.
     *
     * @x-autobe-specification Maps to community_platform_guest_sessions.href. Captured from the client request and stored in the session record for analytics and tracking. Used to identify where the guest initiated their browsing session.
     */
    href: string & tags.Format<"uri">;

    /**
     * URL of the page that referred the guest to this join request. Used for session tracking and analytics.
     *
     * @x-autobe-specification Maps to community_platform_guest_sessions.referrer. Captured from the client request and stored in the session record for analytics and tracking. Used to identify the referring page that led the guest to the platform.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * IP address of the guest. Optional for SSR (Server-Side Rendering) cases where the IP may be determined differently.
     *
     * @x-autobe-specification Maps to community_platform_guest_sessions.ip. Optional field - if not provided by client, the backend may capture the server-side IP. Used for security analytics and rate limiting. Format: IPv4 address.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
