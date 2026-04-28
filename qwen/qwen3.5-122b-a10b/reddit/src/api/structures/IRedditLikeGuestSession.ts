import { tags } from "typia";

import { IRedditLikeGuest } from "./IRedditLikeGuest";

export namespace IRedditLikeGuestSession {
  /**
   * Guest session summary record containing connection metadata for security auditing.
   *
   * This type represents a guest session in list views, providing essential information about session origin and lifecycle for account security monitoring. Each session tracks the client IP address, landing page URL, and referrer information to help detect suspicious login activity from unusual locations.
   *
   * **Session Lifecycle**
   *
   * Sessions have a defined expiration time after which they are automatically invalidated. The created_at and updated_at timestamps track session activity and enable sorting by recency.
   *
   * **Connection Tracking**
   *
   * The ip field stores the client IP address for security monitoring. Optional href and referrer fields capture the landing page and source page respectively, providing context for how the session was initiated.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest session record.
     *
     * This is the primary key that uniquely identifies each session in the system. Generated as a UUID when the session is created.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guest_sessions.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The guest account associated with this session.
     *
     * This is a belongs-to relation that links the session to its parent guest account. Each session belongs to exactly one guest, while a guest may have multiple sessions over time.
     *
         * @x-autobe-database-schema-property redditLikeGuest
         * @x-autobe-specification JOIN from
         *   reddit_like_guest_sessions.reddit_like_guest_id to
         *   reddit_like_guests.id. Returns IRedditLikeGuest.ISummary.
     */
    reddit_like_guest: IRedditLikeGuest.ISummary;

    /**
     * Client IP address that created the session.
     *
     * Used for security monitoring and session validation. This field stores the IPv4 address of the client device that initiated the session, enabling detection of suspicious login activity from unusual locations.
     *
         * @x-autobe-database-schema-property ip
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guest_sessions.ip. IPv4 address string.
     */
    ip: string;

    /**
     * Current page URL when session was created.
     *
     * Tracks the landing page for analytics purposes. This field is optional and may be null if the page URL was not captured during session creation.
     *
         * @x-autobe-database-schema-property href
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guest_sessions.href. Nullable URI string.
     */
    href?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Referring page URL.
     *
     * Captures the source page that led to session creation. This field is optional and may be null if the referrer information was not available or captured during session creation.
     *
         * @x-autobe-database-schema-property referrer
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guest_sessions.referrer. Nullable URI string.
     */
    referrer?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Session creation timestamp.
     *
     * Records when the session was initially established. This timestamp uses UTC timezone and is used for sorting sessions by recency and auditing session lifecycle.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guest_sessions.created_at. Timestamp with timezone.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last update timestamp.
     *
     * Updated on session activity or refresh. This timestamp tracks the most recent modification to the session record and is used for session activity monitoring.
     *
         * @x-autobe-database-schema-property updated_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guest_sessions.updated_at. Timestamp with timezone.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Session expiration timestamp.
     *
     * Sessions are automatically invalidated after this time for security. This field defines when the session should expire and be considered invalid for authentication purposes.
     *
         * @x-autobe-database-schema-property expired_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_guest_sessions.expired_at. Timestamp with timezone.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for filtering and paginating guest session lists.
   *
   * This DTO defines the query parameters available when retrieving guest session records for account security auditing. All fields are optional, allowing clients to construct flexible filtering patterns based on their specific needs.
   *
   * **Filter Capabilities**
   *
   * Clients can filter sessions by IP address for security monitoring, or by creation and expiration date ranges to identify sessions within specific time windows. This supports account security investigations and audit trail analysis.
   *
   * **Pagination and Sorting**
   *
   * Standard pagination parameters control result set size and page navigation. Sorting options allow ordering by any session column, with ascending or descending direction.
   *
   * **Usage Context**
   *
   * Used exclusively by the `/redditLike/member/sessions` endpoint to retrieve paginated lists of guest sessions with optional filtering.
   */
  export type IRequest = {
    /**
     * Client IP address filter for session queries.
     *
     * Filters sessions to only those created from the specified IP address. Useful for security investigations to identify all sessions originating from a particular IP.
     *
     * **Usage**
     *
     * Provide the exact IP address string to match. The filter performs an exact equality comparison.
     *
     * **Format**
     *
     * IPv4 or IPv6 address string (e.g., "192.168.1.1" or "2001:0db8::1").
     *
         * @x-autobe-specification Maps to reddit_like_guest_sessions.ip column.
         *   Used for exact match filtering by client IP address in WHERE
         *   clause.
     */
    ip?: string | undefined;

    /**
     * Lower bound for session creation timestamp filter.
     *
     * Filters to include only sessions created on or after this datetime. Used together with `created_at_to` to define a time window.
     *
     * **Format**
     *
     * ISO 8601 date-time string (e.g., "2024-01-15T10:30:00Z").
     *
     * **Usage**
     *
     * Combine with `created_at_to` to query sessions created within a specific date range. If only `created_at_from` is provided, returns all sessions created after that time.
     *
         * @x-autobe-specification Maps to reddit_like_guest_sessions.created_at
         *   column. Lower bound for creation timestamp range filtering (>=
         *   comparison).
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Upper bound for session creation timestamp filter.
     *
     * Filters to include only sessions created on or before this datetime. Used together with `created_at_from` to define a time window.
     *
     * **Format**
     *
     * ISO 8601 date-time string (e.g., "2024-01-20T15:45:00Z").
     *
     * **Usage**
     *
     * Combine with `created_at_from` to query sessions created within a specific date range. If only `created_at_to` is provided, returns all sessions created before that time.
     *
         * @x-autobe-specification Maps to reddit_like_guest_sessions.created_at
         *   column. Upper bound for creation timestamp range filtering (<=
         *   comparison).
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Lower bound for session expiration timestamp filter.
     *
     * Filters to include only sessions expiring on or after this datetime. Useful for finding sessions that will expire within a future time window.
     *
     * **Format**
     *
     * ISO 8601 date-time string (e.g., "2024-02-01T00:00:00Z").
     *
     * **Usage**
     *
     * Combine with `expired_at_to` to query sessions expiring within a specific date range. Helpful for identifying sessions that need renewal soon.
     *
         * @x-autobe-specification Maps to reddit_like_guest_sessions.expired_at
         *   column. Lower bound for expiration timestamp range filtering (>=
         *   comparison).
     */
    expired_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Upper bound for session expiration timestamp filter.
     *
     * Filters to include only sessions expiring on or before this datetime. Useful for identifying sessions that will expire soon or have already expired.
     *
     * **Format**
     *
     * ISO 8601 date-time string (e.g., "2024-01-25T23:59:59Z").
     *
     * **Usage**
     *
     * Combine with `expired_at_from` to query sessions expiring within a specific date range. Can be used to find sessions requiring immediate attention.
     *
         * @x-autobe-specification Maps to reddit_like_guest_sessions.expired_at
         *   column. Upper bound for expiration timestamp range filtering (<=
         *   comparison).
     */
    expired_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for result pagination.
     *
     * Specifies which page of results to return. Page numbering is 1-indexed, so the first page is page 1.
     *
     * **Constraints**
     *
     * - Minimum value: 1
     * - Default value: 1 (when not provided)
     *
     * **Usage**
     *
     * Combine with `limit` to control result set size. For example, page=2 with limit=10 returns items 11-20. Increment page value to navigate through subsequent pages of results.
     *
         * @x-autobe-specification Computed pagination parameter. 1-indexed page
         *   number for result set navigation. Defaults to 1 when not provided.
         *   Used with 'limit' to calculate OFFSET for database queries: OFFSET
         *   = (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page.
     *
     * Controls how many session records are returned in a single response. Helps manage payload size and improve response performance.
     *
     * **Constraints**
     *
     * - Minimum value: 1
     * - Maximum value: 100
     * - Default value: 10 (when not provided)
     *
     * **Usage**
     *
     * Higher limits reduce the number of API calls needed but increase response size. Use the maximum acceptable value for your use case. The system enforces a maximum of 100 records per page.
     *
         * @x-autobe-specification Computed pagination parameter. Maximum number
         *   of records per page. Clamped to range 1-100. Used with 'page' to
         *   calculate OFFSET for database queries: LIMIT = limit, OFFSET =
         *   (page - 1) * limit.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Column name for result sorting.
     *
     * Specifies which session attribute to use when ordering results. Supports all timestamp and IP address columns.
     *
     * **Valid Values**
     *
     * - `created_at`: Sort by session creation time (default)
     * - `updated_at`: Sort by last update time
     * - `expired_at`: Sort by expiration time
     * - `ip`: Sort by client IP address
     *
     * **Usage**
     *
     * Combine with `order` to control sort direction. Common pattern: sort by `created_at` descending to show most recent sessions first, which is the typical user expectation for activity logs.
     *
         * @x-autobe-specification Computed sorting parameter. Column name to
         *   sort results by. Valid values: 'created_at', 'updated_at',
         *   'expired_at', 'ip'. Defaults to 'created_at' when not provided.
         *   Maps directly to ORDER BY clause.
     */
    sort?: string | undefined;

    /**
     * Sort direction for results.
     *
     * Determines whether results are ordered in ascending or descending order based on the `sort` field.
     *
     * **Valid Values**
     *
     * - `asc`: Ascending order (oldest/lowest first)
     * - `desc`: Descending order (newest/highest first)
     *
     * **Usage**
     *
     * For session lists, `created_at` with `desc` order shows the most recent sessions first, which is the typical user expectation. Use `asc` order when you need chronological ordering from oldest to newest.
     *
         * @x-autobe-specification Computed sorting parameter. Sort direction:
         *   'asc' for ascending, 'desc' for descending. Defaults to 'desc' when
         *   not provided. Maps directly to ORDER BY direction.
     */
    order?: "asc" | "desc" | undefined;
  };
}
