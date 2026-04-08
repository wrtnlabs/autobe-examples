import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCloneGuest {
  /**
   * Authorization response containing JWT tokens and guest session information for authenticated API access. Returns the guest's unique identifier along with access and refresh tokens for maintaining the session.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_clone_guests.id. UUID primary key identifying the guest account.
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
   * Request body for refreshing a guest session by providing the current refresh token to obtain new JWT access and refresh tokens.
   */
  export type IRefresh = {
    /**
     * The current refresh token issued during guest session creation. Used to authenticate the refresh request and generate new access/refresh tokens.
     *
     * @x-autobe-specification JWT refresh token from IAuthorizationToken.refresh field. Server validates this token, extracts guest_id from JWT claims, and issues new access/refresh token pair. This is not a database column - it's a cryptographic token string.
     */
    refreshToken: string;
  };

  /**
   * Request body for guest join operation containing the device fingerprint for session establishment.
   */
  export type IJoin = {
    /**
     * Unique device fingerprint string used to identify and track guest users across sessions.
     *
     * @x-autobe-database-schema-property fingerprint
     * @x-autobe-specification Direct mapping from reddit_clone_guests.fingerprint. Unique constraint. Client-provided device fingerprint string.
     */
    fingerprint: string;

    /**
     * Current page URL from the client request, used for session tracking and analytics.
     *
     * @x-autobe-specification Session context: stored in reddit_clone_guest_sessions.href. Captured from client request for session tracking and analytics.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led the user to this page, used for session tracking and attribution.
     *
     * @x-autobe-specification Session context: stored in reddit_clone_guest_sessions.referrer. Captured from client request header for attribution tracking.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session binding. Optional for browser clients, typically provided in SSR scenarios.
     *
     * @x-autobe-specification Session context: stored in reddit_clone_guest_sessions.ip. Optional in IJoin because SSR captures server-side IP as fallback. Format: ipv4.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Lightweight guest summary for session context display, containing guest ID, device fingerprint, and timestamps.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_clone_guests.id. UUID primary key with auto-generation on creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Device fingerprint string used to uniquely identify and track this guest across sessions.
     *
     * @x-autobe-database-schema-property fingerprint
     * @x-autobe-specification Direct mapping from reddit_clone_guests.fingerprint. Unique constraint enforced at database level.
     */
    fingerprint: string;

    /**
     * Timestamp indicating when the guest account was first created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_clone_guests.created_at. Server-generated on account creation.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp indicating when the guest account was last modified.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from reddit_clone_guests.updated_at. Automatically updated by database trigger on row modification.
     */
    updatedAt: string & tags.Format<"date-time">;
  };
}
