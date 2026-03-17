import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuest {
  /**
   * Lightweight summary of a guest account for listing purposes. Guest accounts represent temporary anonymous users browsing platform content without authentication.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_guests.id (UUID primary key).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Anonymous identifier used for guest tracking across browsing sessions.
     *
     * @x-autobe-database-schema-property anonymous_id
     * @x-autobe-specification Direct mapping from community_platform_guests.anonymous_id. Unique anonymous identifier or device fingerprint.
     */
    anonymous_id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the guest account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_guests.created_at (timestamptz).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the guest account was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from community_platform_guests.updated_at (timestamptz).
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Request body for guest join operation. Contains anonymous identifier for temporary guest account creation and session context for initial browsing session establishment. Used when an unauthenticated user first accesses the platform to obtain a persistent guest identity and session tokens for subsequent API calls.
   */
  export type IJoin = {
    /**
     * Unique anonymous identifier or device fingerprint for guest account tracking. Generated client-side and persists across browsing sessions to enable guest continuity without authentication.
     *
     * @x-autobe-database-schema-property anonymous_id
     * @x-autobe-specification Direct mapping from community_platform_guests.anonymous_id. Unique constraint ensures one guest per anonymous identifier. Client-generated UUIDv4 should be validated for format.
     */
    anonymous_id: string & tags.Format<"uuid">;

    /**
     * Current page URL where the join request originated, used for session context tracking and security monitoring.
     *
     * @x-autobe-specification Stored in community_platform_guest_sessions.href column. Represents the current page URL where the join request originated. Used for session context tracking and security monitoring.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer header value indicating the previous page URL that linked to the current join request.
     *
     * @x-autobe-specification Stored in community_platform_guest_sessions.referrer column. Represents HTTP referrer header indicating the previous page that linked to the current join request.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session security tracking. Optional for client-side only scenarios where IP detection may not be available.
     *
     * @x-autobe-specification Stored in community_platform_guest_sessions.ip column (nullable). Client IP address for session security tracking. If omitted, server may capture IP from request headers as fallback.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Authorization response containing JWT access and refresh tokens with expiration information for guest authentication. Returned when a guest successfully joins the platform or refreshes their session, providing temporary credentials for accessing public content.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest account for which the authorization tokens were generated.
     *
     * @x-autobe-specification Extracted from JWT token subject claim representing authenticated guest ID. Retrieved from community_platform_guests.id during token generation but exposed via JWT.
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
   * Search criteria and pagination parameters for guest accounts. Provides filtering by anonymous identifier (exact or partial match), creation date range, last update date range, sorting options by creation or update timestamps, and pagination controls. Used by administrators to browse temporary guest accounts created for unauthenticated users.
   */
  export type IRequest = {
    /**
     * Search term for partial matching on anonymous identifier. Searches case-insensitively within the anonymous_id field.
     *
     * @x-autobe-specification Applies ILIKE pattern matching on anonymous_id field: WHERE anonymous_id ILIKE '%search%'. Case-insensitive partial matching for administrative search of guest identifiers.
     */
    search?: string | undefined;

    /**
     * Exact anonymous identifier filter. Returns only guest accounts with matching UUID.
     *
     * @x-autobe-specification Applies exact match filtering on anonymous_id field: WHERE anonymous_id = anonymous_id. Used for precise lookup of specific guest accounts by their unique anonymous identifier.
     */
    anonymous_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Start date for filtering guest accounts created after this timestamp (inclusive).
     *
     * @x-autobe-specification Lower bound for created_at date range filtering: WHERE created_at >= created_at_start. Inclusive start timestamp for filtering guest accounts created after a specific time.
     */
    created_at_start?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering guest accounts created before this timestamp (inclusive).
     *
     * @x-autobe-specification Upper bound for created_at date range filtering: WHERE created_at <= created_at_end. Inclusive end timestamp for filtering guest accounts created before a specific time.
     */
    created_at_end?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Start date for filtering guest accounts last updated after this timestamp (inclusive).
     *
     * @x-autobe-specification Lower bound for updated_at date range filtering: WHERE updated_at >= updated_at_start. Inclusive start timestamp for filtering guest accounts last updated after a specific time.
     */
    updated_at_start?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering guest accounts last updated before this timestamp (inclusive).
     *
     * @x-autobe-specification Upper bound for updated_at date range filtering: WHERE updated_at <= updated_at_end. Inclusive end timestamp for filtering guest accounts last updated before a specific time.
     */
    updated_at_end?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Sorting column for ordering results. Either 'created_at' for account creation time or 'updated_at' for last update time.
     *
     * @x-autobe-specification Determines ORDER BY column: either created_at or updated_at. Controls which timestamp field is used for sorting guest account search results.
     */
    sort?: "created_at" | "updated_at" | undefined;

    /**
     * Sorting direction: 'asc' for ascending (oldest first) or 'desc' for descending (newest first).
     *
     * @x-autobe-specification Determines ORDER BY direction: either ASC for ascending (oldest first) or DESC for descending (newest first). Applied to the column selected by the 'sort' parameter.
     */
    order?: "asc" | "desc" | undefined;

    /**
     * Page number for paginated results (1-indexed). Page 1 returns the first set of records.
     *
     * @x-autobe-specification Calculates OFFSET for pagination: OFFSET (page - 1) * limit. 1-indexed page number for navigating through paginated guest account results.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of guest accounts to return per page (1-100). Controls pagination page size.
     *
     * @x-autobe-specification Sets LIMIT clause for pagination: LIMIT limit. Controls maximum number of guest account records returned per page, up to maximum of 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Refresh token request to obtain new access token for guest session. Contains refresh token for validation and optional session metadata (IP, current URL, referrer) for updating session tracking. Used to extend guest browsing session without re-authentication.
   */
  export type IRefresh = {
    /**
     * Refresh token previously issued by the system for guest session renewal.
     *
     * @x-autobe-specification JWT refresh token previously issued by system. Decoded to extract session ID for validation against community_platform_guest_sessions table. Single-use token invalidated after refresh.
     */
    refresh: string;

    /**
     * Current IP address of the guest's connection for session tracking and security auditing.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from community_platform_guest_sessions.ip. Updates session metadata with current connection IP for security auditing.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Current page URL where the refresh request originated, used for session context tracking.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from community_platform_guest_sessions.href. Updates session metadata with current page URL for context tracking.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * HTTP referrer header indicating the previous page the guest navigated from.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from community_platform_guest_sessions.referrer. Updates session metadata with HTTP referrer header for navigation context.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;
  };
}
