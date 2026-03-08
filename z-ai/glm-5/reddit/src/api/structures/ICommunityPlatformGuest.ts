import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuest {
  /**
   * Authorized guest response containing JWT tokens for API authentication. Returned after successful guest join or token refresh operations. Includes the guest identifier, access token for API requests, refresh token for session renewal, and token metadata for client-side expiration management.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest account, used to associate the JWT tokens with the guest identity.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_guests.id. UUID format, uniquely identifies the guest account for session binding.
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
   * Request body for guest account join operation. Contains the device fingerprint for guest account identification and optional session context fields for security monitoring. The device_fingerprint uniquely identifies the guest device across sessions without requiring email or password credentials. Session context fields (href, referrer, ip) can be provided by the client or automatically captured from the HTTP request context for analytics, rate limiting, and security auditing purposes.
   */
  export type IJoin = {
    /**
     * Unique device fingerprint hash identifying the guest device. Generated from browser and device characteristics for session continuity without requiring authentication credentials.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping to community_platform_guests.device_fingerprint column. The device fingerprint is a unique hash string generated from browser and device characteristics. Used as the primary identifier for guest account lookup or creation. Must be unique across all active guest accounts (deleted_at IS NULL). Validated as non-empty string.
     */
    device_fingerprint: string & tags.MinLength<1>;

    /**
     * Current page URL where the guest join request originated. Used for session context tracking and analytics.
     *
     * @x-autobe-specification Cross-table mapping to community_platform_guest_sessions.href. Captured during session creation when the guest joins. The href represents the current page URL where the join request originated. Stored in the sessions table, not the guests table. Used for session context tracking and analytics. Optional field - if not provided by client, can be extracted from HTTP Referer header or request context.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * Referrer URL indicating the page the guest came from before joining. Used for session context tracking and analytics.
     *
     * @x-autobe-specification Cross-table mapping to community_platform_guest_sessions.referrer. Captured during session creation when the guest joins. The referrer indicates the previous page the guest came from before joining. Stored in the sessions table, not the guests table. Used for session context tracking and analytics. Optional field - if not provided by client, can be extracted from HTTP Referer header.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;

    /**
     * Client IP address for security monitoring and rate limiting. Can be provided by client or extracted server-side from HTTP request.
     *
     * @x-autobe-specification Cross-table mapping to community_platform_guest_sessions.ip. Captured during session creation when the guest joins. The IP address is used for security monitoring, rate limiting, and abuse prevention. Stored in the sessions table, not the guests table. Optional field - if not provided by client, extracted server-side from HTTP request (X-Forwarded-For header or socket address). In SSR environments, the client cannot know its own IP, so server-side extraction is the primary source.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for guest token refresh operation. Contains the previously issued JWT refresh token that is exchanged for new access and refresh tokens to maintain continuous API access for guest users without requiring device fingerprint re-identification.
   */
  export type IRefresh = {
    /**
     * Refresh token for obtaining new access tokens without re-authentication.
     *
     * @x-autobe-specification JWT refresh token string previously issued during join or last refresh. Token structure: header.payload.signature format. Contains claims: session_id (UUID reference to community_platform_guest_sessions), guest_id (UUID reference to community_platform_guests), iat (issued at timestamp), exp (expiration timestamp), typ (token type: 'refresh'). Validation flow: (1) Decode and verify signature, (2) Check exp claim against current time, (3) Extract session_id and query community_platform_guest_sessions where id = session_id and expired_at > NOW(), (4) Extract guest_id and verify guest exists in community_platform_guests with deleted_at IS NULL. Token is then invalidated and new tokens issued following rotation pattern.
     */
    refresh: string;
  };
}
