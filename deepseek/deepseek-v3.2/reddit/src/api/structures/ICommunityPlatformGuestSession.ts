import { tags } from "typia";

import { ICommunityPlatformGuest } from "./ICommunityPlatformGuest";

export namespace ICommunityPlatformGuestSession {
  /**
   * Request parameters for filtering and paginating user sessions across all session types (member, admin, guest). Supports filtering by session type, user identification, session status, creation date range, and provides sorting/pagination options for administrative session monitoring.
   */
  export type IRequest = {
    /**
     * Session type filter for narrowing search to specific user categories. Selects which authentication session tables to query: member, admin, or guest sessions.
     *
     * @x-autobe-specification Determines which session tables to query: 'member' filters community_platform_member_sessions, 'admin' filters community_platform_admin_sessions, 'guest' filters community_platform_guest_sessions. When null, queries all three tables. Implementation: Build dynamic WHERE clauses or separate queries based on this value.
     */
    sessionType?: "member" | "admin" | "guest" | null | undefined;

    /**
     * User identifier in UUID format for filtering sessions by specific user. Corresponds to primary key in respective user tables.
     *
     * @x-autobe-specification Filters sessions by user ID. Implementation: For member sessions, match community_platform_member_sessions.member_id; for admin sessions, match community_platform_admin_sessions.admin_id; for guest sessions, match community_platform_guest_sessions.community_platform_guest_id. When sessionType is specified, filter only that table; when null, search across all relevant tables.
     */
    userId?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * User display identifier (username, email, or anonymous ID) for filtering sessions. Performs case-insensitive search across user identifiers.
     *
     * @x-autobe-specification Filters sessions by user display identifier (username or email). Implementation: JOIN with respective user tables (community_platform_members.username/email, community_platform_admins.email, community_platform_guests.anonymous_id) and search using ILIKE/contains pattern matching. When sessionType specified, join only relevant user table; when null, search across all user tables.
     */
    userIdentifier?: string | null | undefined;

    /**
     * Session status filter: 'active' for currently valid sessions, 'expired' for sessions past their expiration timestamp.
     *
     * @x-autobe-specification Calculates session status based on expired_at timestamp: 'active' = expired_at > CURRENT_TIMESTAMP, 'expired' = expired_at <= CURRENT_TIMESTAMP. Implementation: Apply timestamp comparison to expired_at column in respective session tables. When null, returns both active and expired sessions.
     */
    status?: "active" | "expired" | null | undefined;

    /**
     * Start datetime for filtering sessions created on or after this timestamp (inclusive).
     *
     * @x-autobe-specification Start date for creation timestamp range filtering. Implementation: Apply created_at >= createdAtStart filter to respective session tables. When null, no lower bound applied. Format: ISO 8601 datetime string with timezone offset.
     */
    createdAtStart?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * End datetime for filtering sessions created on or before this timestamp (inclusive).
     *
     * @x-autobe-specification End date for creation timestamp range filtering. Implementation: Apply created_at <= createdAtEnd filter to respective session tables. When null, no upper bound applied. Format: ISO 8601 datetime string with timezone offset.
     */
    createdAtEnd?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Sorting method for the paginated session results. Options prioritize by creation date or last activity timestamp.
     *
     * @x-autobe-specification Sorting method for combined session results. 'createdAtDesc': most recent sessions first (created_at DESC). 'createdAtAsc': oldest sessions first (created_at ASC). 'lastActivityDesc': sessions with most recent activity first (requires last_activity column or proxy). Implementation: Apply ORDER BY clause accordingly after merging results from multiple tables.
     */
    sort?:
      | "createdAtDesc"
      | "createdAtAsc"
      | "lastActivityDesc"
      | null
      | undefined;

    /**
     * Page number for paginated results (1-indexed). Defaults to 1 when not specified.
     *
     * @x-autobe-specification Page number for pagination (1-indexed). Implementation: Calculate offset = (page - 1) * limit after applying all filters. When null, defaults to page 1. Must be used with limit parameter.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /**
     * Maximum number of session records to return per page. Range: 1-100.
     *
     * @x-autobe-specification Maximum number of records per page (1-100). Implementation: Apply LIMIT clause after sorting. When null, defaults to a reasonable page size (e.g., 20). Enforce maximum limit of 100 records per page for performance.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | null
      | undefined;
  };

  /**
   * Lightweight summary of a guest session for administrative monitoring and session management. Includes connection metadata (IP, URL, referrer), timestamps, and guest identification for tracking anonymous browsing sessions across the platform.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_guest_sessions.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * IP address of the guest's connection for security and geolocation tracking.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from community_platform_guest_sessions.ip. Stores IPv4 address of guest connection.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * Current page URL where the session was created or last accessed.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from community_platform_guest_sessions.href. Stores current page URL where session was created/last accessed.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer header indicating the previous page the guest navigated from.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from community_platform_guest_sessions.referrer. Stores HTTP referrer header indicating navigation source.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Timestamp when the session was initially created for the guest.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_guest_sessions.created_at. Session creation timestamp.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session will automatically expire for security cleanup.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from community_platform_guest_sessions.expired_at. Session expiration timestamp for automatic cleanup.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * The guest account associated with this session.
     *
     * @x-autobe-database-schema-property guest
     * @x-autobe-specification Relation via community_platform_guest_id foreign key to community_platform_guests table. Returns ISummary of the guest.
     */
    guest: ICommunityPlatformGuest.ISummary;
  };
}
