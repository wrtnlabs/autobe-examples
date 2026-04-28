import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEcommerceMallGuest {
  /**
   * Request to renew guest authentication tokens using a valid refresh token.
   *
   * The refresh token is a JWT that was previously issued during guest registration or session creation. This token is validated against the stored session record to verify it hasn't expired or been revoked. Upon successful validation, new tokens are issued with extended expiration for continued platform access.
   */
  export type IRefresh = {
    /**
     * JWT refresh token string for authentication renewal.
     *
     * This token is validated against the stored guest session record to verify it hasn't expired or been revoked. If valid, it enables renewal of access and refresh tokens without requiring re-registration.
     *
         * @x-autobe-specification JWT refresh token string extracted from
         *   request body. Used to validate against stored guest session record
         *   to verify token validity, expiration, and revocation status before
         *   issuing new tokens.
     */
    refresh: string;
  };

  /**
   * Register a new guest user or refresh an existing guest session.
   *
   * Accepts device fingerprint to uniquely identify the browser/device combination without personal information. Includes session context fields for tracking the user's current page, IP address, and referrer during browsing.
   *
   * Guests receive access and refresh tokens after registration. Sessions expire after 24 hours by default. Existing guests are identified by matching fingerprint, allowing session continuation across visits.
   */
  export type IJoin = {
    /**
     * Unique device fingerprint string that identifies the guest's browser or device combination.
     *
     * This value allows the system to recognize returning guests without requiring personal information, enabling session continuity across visits. The fingerprint is typically generated from browser characteristics, device identifiers, and other telemetry data.
     *
         * @x-autobe-database-schema-property fingerprint
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_guests.fingerprint. Unique identifier for guest
         *   session. Must be provided and cannot be empty. System checks for
         *   existing guest with matching fingerprint to enable session
         *   continuity.
     */
    fingerprint: string;

    /**
     * Current page URL where the guest is browsing.
     *
     * Captured during guest registration to track the user's entry point into the platform. Used for analytics and to maintain context during the browsing session.
     *
         * @x-autobe-specification Session context: passed to
         *   ecommerce_mall_guest_sessions.href during guest session creation.
         *   Represents the current page URL where the guest is browsing when
         *   registration occurs.
     */
    href: string & tags.Format<"uri">;

    /**
     * Client IP address for session tracking and analytics.
     *
     * Captured automatically from the HTTP request during guest registration. Used for security monitoring, session management, and geographic analytics. This is required for all guest sessions.
     *
         * @x-autobe-specification Session context: passed to
         *   ecommerce_mall_guest_sessions.ip during guest session creation.
         *   Captured from HTTP request headers as the client's IP address for
         *   session tracking and analytics.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * Optional referrer URL from which the guest arrived at the platform.
     *
     * Captured from the HTTP Referrer header when available. Used for analytics to understand user acquisition sources. This field is optional and may be omitted if no referrer information is available.
     *
         * @x-autobe-specification Session context: passed to
         *   ecommerce_mall_guest_sessions.referrer during guest session
         *   creation if present. Represents the URL from which the guest
         *   arrived at the platform.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;
  };

  /**
   * Authenticated guest session response containing the guest's unique identifier and authentication tokens.
   *
   * Returned after successful guest registration or token renewal. The `id` uniquely identifies the guest account in the database. The `token` object contains JWT access and refresh tokens needed for authenticated API calls, along with the expiration timestamp.
   *
   * The access token is short-lived for security and must be included in the `Authorization` header for API requests. The refresh token allows token renewal without re-registration. Both tokens are derived from the guest session record and expire according to the session's `expired_at` setting (typically 24 hours).
   */
  export type IAuthorized = {
    /**
     * Guest account identifier.
     *
     * UUID primary key uniquely identifying the guest account in the database. Used to link the authentication response to the specific guest record in `ecommerce_mall_guests`. This identifier is required for token validation and session management.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from ecommerce_mall_guests.id.
         *   UUID string returned in authentication response.
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
}
