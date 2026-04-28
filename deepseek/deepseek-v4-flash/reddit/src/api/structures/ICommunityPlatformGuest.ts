import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuest {
  /**
   * Refresh token credentials for guest session token rotation.
   *
   * Accepts a valid refresh token previously issued during a join or refresh operation. The token is a JWT containing the guest_session_id in its claims, which allows the server to look up the corresponding session record and verify it has not expired. On success, a new JWT access token and refresh token are issued, extending the session lifetime.
   *
   * This type contains only the refresh token string — no additional session context fields are needed, as the token itself carries all necessary identifying information. Session metadata (ip, href, referrer) was already captured during the join operation and is not required for token rotation.
   *
   * Related operations: join (establish initial guest identity and session).
   */
  export type IRefresh = {
    /**
     * JWT refresh token issued during a previous join or refresh operation, used to obtain a new access token and refresh token pair without re-authentication.
     *
     * The token is sent to the refresh endpoint where the server decodes it to identify the guest session, validates the session is still active and unexpired, and issues a fresh token pair. This token rotation mechanism ensures session security without requiring guest credentials to be re-submitted.
     *
         * @x-autobe-specification JWT refresh token string. No direct database
         *   column mapping. The token is validated by decoding the JWT to
         *   extract the guest_session_id claim, then looking up the
         *   corresponding community_platform_guest_sessions record. The session
         *   must exist, belong to an active guest (guest.deleted_at IS NULL,
         *   checked via session.guest relation), and not have expired
         *   (expired_at > now). After successful validation, a new
         *   access/refresh token pair is generated and the session's expired_at
         *   is optionally extended.
     */
    refresh: string;
  };

  /**
   * Authorization response returned after successful guest join or token refresh operations.
   *
   * Contains the guest's unique identifier together with JWT authentication tokens for subsequent API requests within the public browsing zone. The access token authorizes guest-level operations such as browsing public content feeds, viewing user profiles, and reading individual posts and comments. The refresh token enables token rotation without requiring a new join operation.
   *
   * Related operations: join (establish guest identity and receive initial tokens), refresh (renew tokens before session expiration).
   */
  export type IAuthorized = {
    /**
     * Primary key of the guest identity record.
     *
     * This UUID uniquely identifies the guest within the community platform and is used to correlate the guest with their associated session records for analytics and system tracking. The value is auto-generated server-side upon guest creation, or reused from an existing guest record when a returning device fingerprint is detected. Guests retain the same identity across sessions as long as the device fingerprint matches an active record.
     *
         * @x-autobe-specification Resolved from community_platform_guests.id
         *   during guest session establishment. When a guest joins, the server
         *   checks device_fingerprint: if an active record exists (deleted_at
         *   IS NULL), reuses its id; if soft-deleted (deleted_at IS NOT NULL),
         *   reactivates and reuses its id; if no record exists, generates a new
         *   UUID v4 id. The resolved id is returned as a UUID string in this
         *   aggregate authorization response. No direct databaseSchemaProperty
         *   mapping because this id value is resolved programmatically from
         *   guest identity lookup logic rather than read directly from a
         *   column.
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
   * Join the platform as a guest visitor.
   *
   * Provides the device fingerprint for guest identity tracking and session context (current page URL, HTTP referrer, client IP) for analytics purposes.
   *
   * If the device fingerprint is already recognized from a previous visit, the existing guest record is reused. Otherwise, a new guest record is created. A guest session is always established on each join request.
   */
  export type IJoin = {
    /**
     * Unique device fingerprint or anonymous identifier used to recognize a returning guest without authentication.
     *
     * Assigned by the client (e.g., browser fingerprinting, local storage UUID) and sent with each request. Enables the system to maintain continuity for guest browsing across visits. On subsequent visits, the existing guest record is reclaimed rather than creating a duplicate.
     *
         * @x-autobe-database-schema-property device_fingerprint
         * @x-autobe-specification Direct mapping from
         *   community_platform_guests.device_fingerprint. Unique constraint —
         *   existing guest is reclaimed if device_fingerprint matches a
         *   non-deleted record (deleted_at IS NULL). If matched but
         *   soft-deleted (deleted_at IS NOT NULL), the record is reactivated by
         *   setting deleted_at = NULL.
     */
    device_fingerprint: string;

    /**
     * Current page URL at the time of the guest join request.
     *
     * Used for session tracking and analytics to record where the guest initiated their session. This is the URL the guest was visiting when they joined the platform.
     *
         * @x-autobe-specification Stored in
         *   community_platform_guest_sessions.href during session creation.
         *   Cross-table mapping — this value is passed through to the session
         *   record, not stored in the guests table itself. Collected from the
         *   client's current page URL.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referer header value indicating the previous page the visitor navigated from.
     *
     * Used for session tracking and referral analytics to understand traffic sources. Stored as an empty string when no HTTP Referer header is present.
     *
         * @x-autobe-specification Stored in
         *   community_platform_guest_sessions.referrer during session creation.
         *   Cross-table mapping — this value is passed through to the session
         *   record, not stored in the guests table itself. Stored as empty
         *   string when no HTTP Referer header is available.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for the guest session.
     *
     * Optional to support server-side rendering (SSR) scenarios where the IP may already be extracted from request headers server-side, avoiding redundant transmission.
     *
         * @x-autobe-specification Stored in
         *   community_platform_guest_sessions.ip during session creation.
         *   Cross-table mapping — this value is passed through to the session
         *   record, not stored in the guests table itself. Optional to support
         *   SSR scenarios where the server already extracts the IP from request
         *   headers (e.g., X-Forwarded-For), avoiding redundant client-side
         *   transmission. Format: ipv4. When absent, the server extracts the IP
         *   from the request context.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
