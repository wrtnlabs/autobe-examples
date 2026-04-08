import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEcommerceMallGuest {
  /**
   * Authorization response containing guest session identifier and JWT token pair with expiration metadata for maintaining authenticated guest sessions.
   */
  export type IAuthorized = {
    /**
     * The unique identifier of the authenticated guest session.
     *
     * @x-autobe-specification Guest identifier extracted from JWT claims during authentication. Maps to ecommerce_mall_guests.id for session identity. This is a computed value from the JWT token, not a direct database property.
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
   * Request body for guest session establishment. Contains device fingerprint for anonymous visitor identification and session context for navigation tracking.
   */
  export type IJoin = {
    /**
     * @x-autobe-database-schema-property fingerprint
     */
    fingerprint: string;
    href: string & tags.Format<"uri">;
    referrer: string & tags.Format<"uri">;
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for refreshing guest session access token. Contains the refresh token issued during guest join to obtain a new access token without re-authentication. Includes optional client context (IP, URL, referrer) for security tracking.
   */
  export type IRefresh = {
    /**
     * The refresh token issued during guest join used to obtain new access tokens.
     *
     * @x-autobe-specification The refresh token value is used to look up the corresponding session record in ecommerce_mall_guest_sessions. The server validates the token's signature and checks that the session has not expired (expired_at > now). This is NOT a direct column mapping - it's a session lookup operation.
     */
    refreshToken: string;

    /**
     * Guest's IPv4 address for security tracking during token refresh.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Maps directly to ecommerce_mall_guest_sessions.ip. Captured as security context for the refresh request. Optional per SSR conventions.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Current page URL being accessed by the guest during token refresh.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Maps directly to ecommerce_mall_guest_sessions.href. Captures navigation context for audit/security purposes.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * HTTP referrer header indicating the previous page URL.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Maps directly to ecommerce_mall_guest_sessions.referrer. Captures referrer context for analytics and security audit.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;
  };

  /**
   * Lightweight guest summary for session listings containing device identification information.
   */
  export type ISummary = {
    /**
     * Unique identifier of the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.id (UUID primary key). Unique identifier for the guest account.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Device fingerprint string used to identify anonymous guest visitors across sessions.
     *
     * @x-autobe-database-schema-property fingerprint
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.fingerprint. Unique constraint enforced. Device fingerprint string used to identify anonymous guest visitors across sessions.
     */
    fingerprint: string;

    /**
     * Browser or client user agent string for device identification and analytics.
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Direct mapping from ecommerce_mall_guests.user_agent. Nullable field storing browser or client user agent string for device identification and analytics.
     */
    userAgent: string | null;
  };
}
