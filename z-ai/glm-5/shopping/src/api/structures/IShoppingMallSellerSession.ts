import { tags } from "typia";

export namespace IShoppingMallSellerSession {
  /**
   * Lightweight session summary for displaying in a seller's login history. Contains essential connection metadata including IP address, request URLs, and temporal boundaries for security monitoring and session management purposes. Each session represents a single authentication event with a maximum 24-hour duration.
   */
  export type ISummary = {
    /**
     * Unique session identifier used as the 'sid' claim in JWT tokens for seller authentication sessions.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.id. UUID primary key used as the 'sid' claim in JWT tokens for session identification.
     */
    id: string & tags.Format<"uuid">;

    /**
     * IP address of the client at the time of session creation. Used for security auditing and session tracking.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.ip. Client IP address captured at authentication time for security audit trail.
     */
    ip: string;

    /**
     * The URL (href) where the authentication was initiated. Captures the landing page or entry point for the seller's login session.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.href. The landing page URL where the authentication flow was initiated.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer header value from the authentication request. Identifies the referring page that led to the login page for security tracking.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.referrer. Nullable - HTTP Referer header from the login request. Captures the external source that linked to the login page.
     */
    referrer: (string & tags.Format<"uri">) | null;

    /**
     * Timestamp when this session was created. This is the login time recorded when authentication succeeds.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.created_at. Timestamp recorded when authentication succeeds. Used for session duration tracking and sorting sessions by most recent.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session expires. Maximum session duration is 24 hours from creation.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.expired_at. Calculated as created_at + 24 hours. Sessions are invalidated after this timestamp regardless of activity.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for listing authentication sessions with optional date range filtering and cursor-based pagination. Allows sellers to query their complete login history with filtering by creation date range. All parameters are optional - when no filters are provided, returns the most recent sessions first.
   */
  export type IRequest = {
    /**
     * Filter sessions created at or after this timestamp. Use ISO 8601 format (e.g., 2024-01-15T00:00:00Z).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Query parameter that filters sessions created at or after this timestamp. Creates a WHERE created_at >= :from condition. Used in combination with 'to' parameter for date range queries. Value must be ISO 8601 formatted datetime string.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created at or before this timestamp. Use ISO 8601 format (e.g., 2024-01-31T23:59:59Z).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Query parameter that filters sessions created at or before this timestamp. Creates a WHERE created_at <= :to condition. Used in combination with 'from' parameter for date range queries. Value must be ISO 8601 formatted datetime string.
     */
    to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Cursor timestamp for pagination. Returns sessions created before this timestamp. Used with 'id' parameter for cursor-based navigation.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Cursor timestamp for cursor-based pagination. When provided, returns sessions created before this timestamp. Used in combination with 'id' for tie-breaking when multiple sessions share the same creation timestamp. Creates a WHERE condition: (created_at < :created_at) OR (created_at = :created_at AND id < :id). Must be ISO 8601 formatted datetime string.
     */
    created_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Cursor ID for pagination tie-breaking. Used alongside 'created_at' parameter for consistent ordering.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Cursor UUID for cursor-based pagination tie-breaking. When provided with 'created_at', ensures deterministic ordering when multiple sessions have identical creation timestamps. Used in WHERE clause: (created_at < :created_at) OR (created_at = :created_at AND id < :id). Must be a valid UUID string.
     */
    id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Maximum number of sessions to return per page. Default is 20, maximum is 100.
     *
     * @x-autobe-specification Query parameter controlling the maximum number of sessions returned per page. Applied as LIMIT clause in the database query. Default value is 20 if not specified. Maximum allowed value is 100. Minimum allowed value is 1.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Target page number to retrieve (1-indexed). Defaults to page 1 if not specified.
     *
     * @x-autobe-specification Query parameter for page-based navigation. Specifies which page of results to return (1-indexed). When provided, calculates offset as (page - 1) * limit. If omitted, null, or undefined, defaults to page 1. Requesting a page beyond available data returns an empty data array with valid pagination metadata.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
