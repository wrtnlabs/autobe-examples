import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IHrmPlatformGuest {
  /**
   * Guest session refresh request containing the current refresh token.
   *
   * This request is submitted to POST /hrmPlatform/auth/guest/refresh to renew an expiring guest session. The client provides the current refresh token, which the server validates against the hrm_platform_guest_sessions table.
   *
   * The refresh_token field contains the JWT refresh token string. Upon successful validation, the server generates a new access token and refresh token pair with updated expiration timestamps.
   */
  export type IRefresh = {
    /**
     * The current refresh token to validate and exchange for new tokens.
     *
     * This JWT token was issued during the initial guest join operation or a previous refresh. The server validates this token against the hrm_platform_guest_sessions table to verify the session is still active and has not expired.
     *
     * The token must be a valid JWT string. If the token is invalid, malformed, expired, or the associated guest account has been deleted, the refresh operation will fail with a 401 Unauthorized error and the client must create a new guest session via the join endpoint.
     *
     * @x-autobe-specification JWT refresh token string provided by client. Validated against hrm_platform_guest_sessions table: verify token signature, check expired_at > current time, confirm referenced guest account exists and is not soft-deleted. Server-side computation generates new token pair upon successful validation.
     */
    refresh_token: string;
  };

  /**
   * Guest authentication response containing the guest identifier and JWT session tokens.
   *
   * This type is returned when a guest account is created via the join operation or when refreshing an existing guest session. The response includes the guest's unique identifier and a token object containing the access token, refresh token, and expiration timestamps.
   *
   * The access token is used for authenticating subsequent API requests. The refresh token is used to obtain new access tokens when the current one expires via the refresh operation. The expired_at timestamp indicates when the access token expires, and refreshable_until indicates the absolute session expiration deadline.
   */
  export type IAuthorized = {
    /**
     * The unique identifier of the guest account.
     *
     * This UUID is automatically generated when the guest account is created. It identifies the guest throughout their session and is used to track their activity on the platform.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from hrm_platform_guests.id. UUID format.
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
   * Guest registration request for creating a guest account and initial session.
   *
   * This DTO is used when unauthenticated visitors access the platform. The device_fingerprint uniquely identifies the visitor's device and persists across browser sessions. If not provided, the server generates one from request characteristics.
   *
   * The session context fields (href, referrer, ip) capture the request context for creating the initial guest session record in hrm_platform_guest_sessions. These fields enable session tracking and audit capabilities.
   */
  export type IJoin = {
    /**
     * Optional unique identifier derived from device characteristics for guest tracking.
     *
     * The device fingerprint uniquely identifies the visitor's device and persists across browser sessions. When provided, it must be unique across all guest accounts. If omitted, the server automatically generates a fingerprint from request characteristics.
     *
     * This enables the platform to maintain guest state across page loads and browser sessions without requiring authentication, and supports features like preserving registration form state across page reloads.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping to hrm_platform_guests.device_fingerprint. Optional field - if not provided in request, server generates unique fingerprint from request characteristics. Must be unique across all guest records.
     */
    device_fingerprint?: string | undefined;

    /**
     * The URL the guest was accessing when registration was initiated.
     *
     * This field captures the entry point URL for session context tracking. It is stored in the hrm_platform_guest_sessions table (not in hrm_platform_guests) to maintain audit trail of how the guest arrived at the platform.
     *
     * Required for all guest registration requests to enable proper session tracking and analytics.
     *
     * @x-autobe-specification Session context field - NOT stored in hrm_platform_guests. Used to create hrm_platform_guest_sessions record with the URL the guest was accessing. Required field for session tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referring URL that led the guest to the registration page.
     *
     * This field captures the traffic source for session context tracking. It is stored in the hrm_platform_guest_sessions table (not in hrm_platform_guests) to maintain audit trail of the guest's navigation path.
     *
     * Required for all guest registration requests to enable proper session tracking and analytics.
     *
     * @x-autobe-specification Session context field - NOT stored in hrm_platform_guests. Used to create hrm_platform_guest_sessions record with the referring URL. Required field for session tracking.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Optional IP address of the guest for session context tracking.
     *
     * This field captures the client's IP address for the guest session record. It is stored in the hrm_platform_guest_sessions table (not in hrm_platform_guests) for audit and security purposes.
     *
     * Optional to support server-side rendering (SSR) scenarios where the client cannot directly know its own IP address. When omitted, the server automatically captures the IP from the request context as a fallback.
     *
     * @x-autobe-specification Session context field - NOT stored in hrm_platform_guests. Used to create hrm_platform_guest_sessions record with client IP address. Optional field to support SSR scenarios where client cannot know its own IP (server captures as fallback: body.ip ?? serverIp).
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
