import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCommunityGuest {
  /**
   * Request body for refreshing expired guest session tokens. Contains the refresh token from the previous authentication session and session context information (current page, referrer, IP) for audit tracking and session validation.
   */
  export type IRefresh = {
    /**
     * Refresh token from the previous guest session used to validate and renew the authentication session.
     *
     * @x-autobe-specification Lookup key for session validation. Backend queries reddit_community_guest_sessions to find matching session by refresh_token value, validates expired_at is in future, then generates new token pair. Not a direct DB column - token is stored/verified against session record.
     */
    refresh_token: string;

    /**
     * Current page URI where the refresh request originates, stored for session audit tracking.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from reddit_community_guest_sessions.href. Updated on each refresh request for session context tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * Previous page URI that navigated to the current page, stored for session audit tracking.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from reddit_community_guest_sessions.referrer. Updated on each refresh request for session context tracking.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session tracking and security audit. Optional in SSR scenarios where the server captures the IP automatically.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from reddit_community_guest_sessions.ip. Optional for SSR scenarios where server captures IP as fallback. Updated on each refresh request.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for guest account registration or retrieval using device fingerprint authentication. Enables anonymous visitors to obtain temporary browsing credentials without email or password registration. The device fingerprint uniquely identifies the user's browser or device for session tracking.
   */
  export type IJoin = {
    /**
     * Unique device identifier for guest session tracking and access control. This fingerprint identifies the user's browser or device for anonymous browsing.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from reddit_community_guests.device_fingerprint. Unique constraint enforced by DB. Used to identify existing guest or create new guest account.
     */
    deviceFingerprint: string;

    /**
     * Current page URL where the guest join was initiated. Used for security monitoring and analytics.
     *
     * @x-autobe-specification Session context field captured by server and stored in reddit_community_guest_sessions.href. Not stored in guests table. Client provides current page URL where join was initiated for analytics and security tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led to the guest join request. Used for analytics and traffic source identification.
     *
     * @x-autobe-specification Session context field captured by server and stored in reddit_community_guest_sessions.referrer. Not stored in guests table. Client provides referrer URL that led to the join request for traffic source tracking.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for security tracking. Optional for SSR cases where server provides fallback.
     *
     * @x-autobe-specification Session context field captured by server and stored in reddit_community_guest_sessions.ip. Not stored in guests table. Optional because in SSR (Server Side Rendering) the client cannot know its own IP - server captures it as fallback (body.ip ?? serverIp). Format: ipv4.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Guest authentication response containing the guest account identifier and JWT authorization token pair for anonymous browsing access. This DTO is returned by both the guest join endpoint (POST /redditCommunity/auth/guest/join) and guest refresh endpoint (POST /redditCommunity/auth/guest/refresh). The id field uniquely identifies the guest account created from device fingerprint. The token field contains the access token for authenticating subsequent API requests, the refresh token for obtaining new access tokens without re-registration, and expiration timestamps indicating when the access token expires and when the session can no longer be refreshed. Clients must store these tokens securely and include the access token in the Authorization header as 'Bearer {access}' for all authenticated requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest account. UUID format. This ID identifies the anonymous user session and is used for tracking guest activity across the platform.
     *
     * @x-autobe-specification Computed from reddit_community_guests.id. UUID format. Backend generates unique guest ID when creating new guest account from device fingerprint, or retrieves existing guest.id if fingerprint already registered. This is the primary identifier for the guest account used throughout the platform.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
