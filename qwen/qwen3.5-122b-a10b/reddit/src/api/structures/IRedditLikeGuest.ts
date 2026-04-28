import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditLikeGuest {
  /**
   * Guest session token refresh request.
   *
   * This request body contains the current refresh token used to renew an expired access token. The server validates the token and issues new JWT credentials if the guest session is still valid.
   *
   * **Token Validation Process**
   *
   * The refresh_token is decoded and verified for signature authenticity and expiration status. The extracted guest_id is used to verify the guest account exists in reddit_like_guests (not soft-deleted) and that a corresponding valid session exists in reddit_like_guest_sessions.
   *
   * **Client Usage**
   *
   * Clients should include this request when their access token expires. Upon receiving a 401 or 410 error, redirect to /redditLike/auth/guest/join for re-registration. On success, replace both access and refresh tokens with the newly issued ones from the response.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for guest session renewal.
     *
     * This token is issued during guest registration or previous refresh operations. It must be a valid, non-expired JWT signed by the server. The token payload contains the guest_id which is used to verify guest account and session existence.
     *
     * **Validation Requirements**
     *
     * The server validates the refresh_token by: (1) verifying the JWT signature, (2) checking expiration status, (3) confirming guest_id exists in reddit_like_guests with deleted_at IS NULL, and (4) verifying corresponding session in reddit_like_guest_sessions has expired_at in the future.
     *
     * **Error Handling**
     *
     * Invalid or expired tokens result in 401 authentication errors. Non-existent guest or session results in 404 errors. Expired sessions result in 410 errors. Clients should redirect to /redditLike/auth/guest/join for re-registration upon receiving these errors.
     *
         * @x-autobe-specification JWT refresh token provided by client for
         *   session renewal. Server validates token signature, expiration,
         *   guest_id existence in reddit_like_guests (deleted_at IS NULL), and
         *   session validity in reddit_like_guest_sessions (expired_at > NOW)
         *   before issuing new tokens. Token is decoded to extract guest_id for
         *   verification.
     */
    refresh_token: string;
  };

  /**
   * Guest authorization response containing JWT tokens and guest identifier.
   *
   * This type is returned when a guest registers or refreshes their session tokens. It includes the unique guest_id and JWT tokens for subsequent authenticated requests.
   *
   * **Token Components**
   *
   * The token object contains access and refresh JWT tokens with their expiration timestamp. The access token is used for authenticated API requests, while the refresh token enables token renewal without re-registration.
   *
   * **Guest Identifier**
   *
   * The guest_id uniquely identifies the guest account in the system, corresponding to the id field in the reddit_like_guests table. This identifier is used in subsequent authenticated requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * This UUID corresponds to the id field in the reddit_like_guests table and uniquely identifies the guest across the system. It is returned upon successful guest registration and must be included in subsequent authenticated requests.
     *
     * **Format**
     *
     * UUID v4 format (e.g., "550e8400-e29b-41d4-a716-446655440000").
     *
         * @x-autobe-specification Retrieved from reddit_like_guests.id. UUID
         *   format. This is the primary key uniquely identifying the guest
         *   account in the database. The value is fetched from the
         *   reddit_like_guests table upon successful guest registration or
         *   session refresh.
     */
    guest_id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
         * @x-autobe-specification Authorization token comes from the session
         *   table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Guest registration request for creating a new anonymous guest account identified by device fingerprint.
   *
   * This request initiates the guest account creation process, enabling unauthenticated users to browse public communities, posts, and comments without registration. The device fingerprint serves as the unique identifier for persistent guest identity across multiple sessions.
   *
   * **Device Fingerprint**
   *
   * The device_fingerprint is a unique string generated from device characteristics (user agent, screen resolution, timezone, etc.) that identifies the guest account. It must be 1-256 characters and is validated for uniqueness against existing guest accounts.
   *
   * **Session Context**
   *
   * The href, referrer, and optional ip fields capture the client's connection context at registration time. These are stored in the session table for analytics and security monitoring, not in the guest account itself.
   */
  export type IJoin = {
    /**
     * Unique device/browser fingerprint identifying the guest account.
     *
     * Generated from device characteristics such as user agent, screen resolution, timezone, and other browser properties to persist guest identity across multiple sessions. This fingerprint serves as the primary identifier for detecting duplicate registrations and linking multiple guest sessions to the same guest account.
     *
     * **Validation**
     *
     * Must be a non-empty string between 1 and 256 characters. The system checks for existing guest accounts with the same fingerprint and returns a conflict error if found.
     *
         * @x-autobe-database-schema-property device_fingerprint
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guests.device_fingerprint column. Unique constraint
         *   enforced at database level. Validated for length (1-256 characters)
         *   and uniqueness against existing guest accounts.
     */
    device_fingerprint: string & tags.MinLength<1> & tags.MaxLength<256>;

    /**
     * The landing page URL where the guest initiated the registration process.
     *
     * Captured from the client's browser or provided as a query parameter during the registration request. This URL is stored in the session record for analytics and user journey tracking purposes.
     *
     * **Format**
     *
     * Must be a valid URI string. Required for all registration requests to enable proper analytics and security monitoring.
     *
         * @x-autobe-specification Session context field captured during guest
         *   registration. Stored in reddit_like_guest_sessions.href column, not
         *   in reddit_like_guests table. Represents the landing page URL where
         *   the guest initiated registration.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referring page URL that directed the guest to the registration page.
     *
     * Captured from the HTTP referrer header or provided as a query parameter. This information helps track user acquisition sources and is stored in the session record for analytics purposes.
     *
     * **Format**
     *
     * Must be a valid URI string. Required for all registration requests to enable proper attribution and analytics.
     *
         * @x-autobe-specification Session context field captured during guest
         *   registration. Stored in reddit_like_guest_sessions.referrer column,
         *   not in reddit_like_guests table. Represents the referring page URL
         *   that led the guest to the registration page.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * The client's IP address at the time of registration.
     *
     * Used for security monitoring, fraud detection, and analytics. This field is optional because in server-side rendering scenarios, the client browser cannot determine its own public IP address. The server may capture the IP from the request headers as a fallback if not provided in the body.
     *
     * **Format**
     *
     * Must be a valid IPv4 address string when provided. Optional field - may be omitted in SSR scenarios where the server captures the IP separately.
     *
         * @x-autobe-specification Session context field captured during guest
         *   registration. Stored in reddit_like_guest_sessions.ip column, not
         *   in reddit_like_guests table. Optional in IJoin because in SSR
         *   (Server Side Rendering) the client cannot determine its own IP -
         *   the server captures it as fallback (body.ip ?? serverIp).
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Guest account summary record for session tracking and security auditing.
   *
   * This type represents a temporary guest account in session views, providing essential identification and lifecycle information for security monitoring. Guest accounts are device-based identities created for anonymous browsing of public content without registration.
   *
   * **Account Lifecycle**
   *
   * Guest accounts are soft-deleted via the deleted_at field when inactive or when a user registers. The created_at and updated_at timestamps track account creation and last activity for auditing purposes.
   *
   * **Device Identity**
   *
   * Each guest account is uniquely identified by a device fingerprint internally, but this sensitive tracking data is not exposed in the public API. The id field serves as the public identifier for guest account references in session records.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest account.
     *
     * This is the primary key that uniquely identifies each guest account in the system. Generated as a UUID when the guest account is created during initial device fingerprint detection.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from reddit_like_guests.id
         *   (UUID). Primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Guest account creation timestamp.
     *
     * Records when the guest account was initially created. This timestamp uses UTC timezone and tracks when the device first accessed the platform as a guest.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guests.created_at (timestamptz).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last update timestamp.
     *
     * Updated when the guest account is modified. This timestamp tracks the most recent activity on the guest account record.
     *
         * @x-autobe-database-schema-property updated_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guests.updated_at (timestamptz).
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp.
     *
     * Null for active guest accounts. Set to the deletion time when the guest account is soft-deleted, such as when a user registers with credentials or after extended inactivity.
     *
         * @x-autobe-database-schema-property deleted_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guests.deleted_at (nullable timestamptz).
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
