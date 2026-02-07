import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityGuest {
  /**
   * Request body for creating a guest session with client device and session context. This endpoint is used by unauthenticated users to establish a temporary identity on the platform. The system captures client-provided session context (href, referrer, ip) to enable personalized content delivery and analytics while maintaining guest anonymity. No personal identification information is collected - the system generates a device fingerprint server-side based on browser and device characteristics.
   */
  export type IJoin = {};

  /**
   * Authentication request to extend a guest session using a refresh token and device fingerprint. No user credentials are required. Used exclusively by unauthenticated guests to maintain session without registration.
   */
  export type IRefresh = {};

  /**
   * A lightweight summary of a guest user session, containing only the essential identifying information and creation timestamp. Used in paginated listings of guest sessions to minimize payload size while providing sufficient context for monitoring and analytics.
   */
  export type ISummary = {};

  /**
   * Authorization response containing signed JWT tokens for temporary guest access. Includes a 30-minute access token, 30-day refresh token, expiration timestamp, and complete token structure with refreshable_until timing. No user identity is included - authentication is based solely on token validity and device fingerprint correlation.
   */
  export type IAuthorized = {
    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Filter and pagination parameters for querying guest user sessions. Used by administrators and system monitors to analyze anonymous access patterns, detect bot activity, or perform maintenance. All parameters are optional and support flexible filtering.
   */
  export type IRequest = {};
}
