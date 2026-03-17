import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Complete guest authorization response including guest account information and JWT session tokens. Returned after successful guest join or refresh operations, providing temporary authenticated access to authentication interfaces. Contains guest identity, timestamps, and dual-token authentication structure.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_guests.id. Auto-generated UUID primary key for guest account identification.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Device fingerprint used to uniquely identify and prevent duplicate guest accounts from the same device.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from todo_app_guests.device_fingerprint. Unique identifier derived from device characteristics for duplicate prevention and session tracking.
     */
    device_fingerprint: string;

    /**
     * Date and time when the guest account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from todo_app_guests.created_at. Timestamp when guest account was automatically created for authentication entry.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Date and time when the guest account was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from todo_app_guests.updated_at. Timestamp when guest account was last updated, typically during session creation or refresh.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Date and time when the guest account was soft-deleted, or null if the account is active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from todo_app_guests.deleted_at. Nullable timestamp indicating when guest account was soft-deleted; null for active accounts.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for creating a temporary guest account. Contains device fingerprint for unique guest identification and session context information for tracking the join request. Used for POST /todoApp/auth/guest/join endpoint.
   */
  export type IJoin = {
    /**
     * Unique identifier derived from device characteristics (browser fingerprint, IP, user agent) to prevent duplicate guest accounts from the same device.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from todo_app_guests.device_fingerprint. Must be unique across all guest accounts.
     */
    device_fingerprint: string;

    /**
     * The URL of the current page where the guest join request originated, used for session tracking and analytics.
     *
     * @x-autobe-specification Captured from HTTP request headers as current page URL for session context. Used for audit trail but not stored in guest table.
     */
    href: string & tags.Format<"uri">;

    /**
     * The URL of the referring page that directed the user to the guest join endpoint, used for traffic source tracking.
     *
     * @x-autobe-specification Captured from HTTP request headers as referrer URL for session context. Used for audit trail but not stored in guest table.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client's IP address (IPv4 format) for session context, optional as server may capture it from request headers.
     *
     * @x-autobe-specification Client IP address (IPv4) captured from HTTP request headers. Optional because in SSR (Server Side Rendering) the client cannot know its own IP - server captures as fallback.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for refreshing guest session tokens. Contains the refresh token and session context information for security auditing. The refresh token is validated against existing guest sessions, and if valid, new access and refresh tokens are issued. Session context fields (href, referrer, ip) are recorded for security logging purposes.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for guest session renewal. Must be valid and not expired.
     *
     * @x-autobe-specification JWT refresh token from guest session. Must be validated against todo_app_guest_sessions table records, checking token validity, expiration, and association with active guest account. After successful refresh, the token is invalidated to prevent reuse.
     */
    refresh_token: string;

    /**
     * Current URL where the refresh request originated. Used for session auditing.
     *
     * @x-autobe-specification Current URL captured from HTTP request. Used for security audit logging in session refresh events. Must be valid URI format. Stored in session audit logs for traceability.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referrer header indicating where the guest came from. May be empty string.
     *
     * @x-autobe-specification HTTP Referrer header from request. Captured for security audit logs to track user navigation path. May be empty string if not provided by browser.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for security logging. Optional for server-side rendering cases.
     *
     * @x-autobe-specification Client IP address from HTTP request. Optional for SSR cases where client IP might not be available (server captures as fallback). Format must be IPv4. Used for security logging in session refresh events.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };
}
