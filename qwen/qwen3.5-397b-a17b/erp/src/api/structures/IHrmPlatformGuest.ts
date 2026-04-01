import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IHrmPlatformGuest {
  /**
   * Request body for renewing a guest session. Contains the refresh token issued during guest join or previous refresh operation. The token is validated against the guest sessions table to generate new authentication tokens for continued anonymous access.
   */
  export type IRefresh = {
    /**
     * Refresh token issued during guest join or previous refresh operation. Used to validate and renew the guest session without re-registering with device fingerprint.
     *
     * @x-autobe-specification Computed input property for session validation. NOT a direct DB column mapping. Backend receives this plaintext token string and validates it against hrm_platform_guest_sessions table by: (1) querying for active session where expired_at > current time, (2) validating token matches (via hash comparison or JWT verification depending on implementation). On successful validation: generates new access/refresh token pair, extends session expired_at. On failure: returns 401 Unauthorized. The token value itself is not stored as-is in the database.
     */
    refreshToken: string;
  };

  /**
   * Guest authentication response containing the guest identifier and session tokens for accessing guest-scoped endpoints.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-specification Value sourced from hrm_platform_guests.id column. UUID format. Returned as part of authentication response to identify the guest account. Although sourced from DB, this DTO is computed (not table-mapped), so databaseSchemaProperty is null.
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
   * Request body for registering a new guest account using device fingerprint identification. Includes session context metadata (current page URL, referrer URL, and client IP) for tracking the client's browsing context during registration.
   */
  export type IJoin = {
    /**
     * Unique device identifier for guest recognition and future session restoration.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from hrm_platform_guests.device_fingerprint. Must be unique - validated against existing guests. Used to recognize returning guests without email/password credentials.
     */
    device_fingerprint: string;

    /**
     * Current page URL where the guest registration was initiated.
     *
     * @x-autobe-specification Captured from request headers (Origin or Referer header). Stored in hrm_platform_guest_sessions.href, not in hrm_platform_guests. Represents the current page URL where guest registration was initiated.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that navigated to the registration page.
     *
     * @x-autobe-specification Captured from request headers (Referer header). Stored in hrm_platform_guest_sessions.referrer, not in hrm_platform_guests. Represents the URL that navigated to the registration page.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session audit. Optional for server-side rendering scenarios.
     *
     * @x-autobe-specification Captured from request headers (X-Forwarded-For or remote address). Stored in hrm_platform_guest_sessions.ip, not in hrm_platform_guests. Optional because in server-side rendering scenarios the client cannot know its own IP - server captures it as fallback. Format: IPv4 address.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
