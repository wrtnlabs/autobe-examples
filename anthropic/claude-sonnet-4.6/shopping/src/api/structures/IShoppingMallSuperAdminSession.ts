import { tags } from "typia";

export namespace IShoppingMallSuperAdminSession {
  /**
   * Lightweight summary record of a single super administrator JWT session on the shopping mall platform. Used in paginated session audit lists accessible to super administrators for security monitoring and cross-platform oversight. Each record includes session identity, the owning super administrator's ID, connection context (IP, page URL, referrer), lifecycle timestamps, and an active status flag. The `actorType` discriminator is always `"superAdmin"`, enabling consumers to distinguish super administrator sessions in unified multi-actor session lists. Sensitive token values are never exposed.
   */
  export type ISummary = {
    /**
     * Unique identifier of the super administrator session record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_super_admin_sessions.id. UUID v4 primary key uniquely identifying this session record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Actor type discriminator. Always `"superAdmin"` for this record type, enabling consumers to distinguish super administrator sessions from other actor session types in unified session audit lists.
     *
     * @x-autobe-specification Computed constant value: always 'superAdmin'. Not stored as a column in shopping_mall_super_admin_sessions; derived at query/serialization time as a discriminator to differentiate super administrator sessions from customer, seller, admin, and guest sessions in unified paginated session responses.
     */
    actorType: "superAdmin";

    /**
     * Unique identifier of the super administrator account that owns this session.
     *
     * @x-autobe-database-schema-property shopping_mall_super_admin_id
     * @x-autobe-specification Direct mapping from shopping_mall_super_admin_sessions.shopping_mall_super_admin_id. UUID of the super administrator who owns this session.
     */
    actorId: string & tags.Format<"uuid">;

    /**
     * IP address of the client device at the time this session was created.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from shopping_mall_super_admin_sessions.ip. Stores the client's IP address as a string at the time the session was created (login). Used for security auditing.
     */
    ip: string;

    /**
     * Full URL of the page from which this session was initiated (the login page URL).
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from shopping_mall_super_admin_sessions.href. Full URL of the page from which the login request was initiated, captured for session context and security auditing.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer header value at the time this session was created, indicating the page that led to the login action.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from shopping_mall_super_admin_sessions.referrer. HTTP Referer header value at the time of login, captured for security auditing and traffic analysis.
     */
    referrer: string;

    /**
     * Indicates whether this session is currently active. `true` if the session has not expired or been invalidated; `false` if it has been logged out or has expired.
     *
     * @x-autobe-specification Computed field. Evaluate as: (expired_at IS NULL OR expired_at > CURRENT_TIMESTAMP). Returns true if the session has not yet been explicitly expired or logged out; false otherwise. Based on shopping_mall_super_admin_sessions.expired_at.
     */
    isActive: boolean;

    /**
     * Timestamp when this session was created (i.e., when the super administrator logged in).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_super_admin_sessions.created_at. Timestamptz column recording when the session was created (i.e., when the super administrator logged in).
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session expired or was explicitly invalidated via logout. When this value has passed the current time (or the session was forcibly terminated), the session is no longer active.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from shopping_mall_super_admin_sessions.expired_at. Timestamptz column recording when the session expired or was explicitly invalidated via logout. A non-null value means the session is no longer valid.
     */
    expiredAt: string & tags.Format<"date-time">;
  };

  /**
   * Search criteria and pagination parameters for filtering and browsing super administrator session records. All fields are optional; omitting a field applies no restriction for that criterion. Use this request body with the session listing endpoint to audit and monitor super administrator session activity across the platform.
   */
  export type IRequest = {
    /**
     * Optional IP address filter. When provided, returns only sessions whose IP address exactly matches or starts with the given value. Supports both exact and prefix matching. Null applies no IP restriction.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Optional filter on the ip column of shopping_mall_super_admin_sessions. Apply as WHERE ip = :ip (exact match) OR ip LIKE ':ip%' (prefix match). Null means no IP filter is applied.
     */
    ip?: string | null | undefined;

    /**
     * Optional active/expired status filter. When true, returns only sessions that are currently active (not yet expired). When false, returns only expired or logged-out sessions. Null returns all sessions regardless of status.
     *
     * @x-autobe-specification Computed filter. When true, apply WHERE expired_at > NOW() to return only currently active (non-expired) sessions. When false, apply WHERE expired_at <= NOW() to return only expired or explicitly invalidated sessions. When null, no activity status filter is applied.
     */
    isActive?: boolean | null | undefined;

    /**
     * Optional lower bound for the session creation timestamp. When provided, only sessions created at or after this date-time are returned. Null applies no lower bound.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Optional lower bound filter on the created_at column of shopping_mall_super_admin_sessions. Apply as WHERE created_at >= :createdAtFrom. Null means no lower bound on creation timestamp.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional upper bound for the session creation timestamp. When provided, only sessions created at or before this date-time are returned. Null applies no upper bound.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Optional upper bound filter on the created_at column of shopping_mall_super_admin_sessions. Apply as WHERE created_at <= :createdAtTo. Null means no upper bound on creation timestamp.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional lower bound for the session expiration timestamp. When provided, only sessions expiring at or after this date-time are returned. Null applies no lower bound.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Optional lower bound filter on the expired_at column of shopping_mall_super_admin_sessions. Apply as WHERE expired_at >= :expiredAtFrom. Null means no lower bound on expiration timestamp.
     */
    expiredAtFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional upper bound for the session expiration timestamp. When provided, only sessions expiring at or before this date-time are returned. Null applies no upper bound.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Optional upper bound filter on the expired_at column of shopping_mall_super_admin_sessions. Apply as WHERE expired_at <= :expiredAtTo. Null means no upper bound on expiration timestamp.
     */
    expiredAtTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Page number to retrieve (1-indexed). Defaults to 1 when not specified. Used together with limit to navigate through paginated results.
     *
     * @x-autobe-specification Pagination control. Specifies the 1-indexed page number of results to return. Default is 1 when null or omitted. Used with limit to compute the SQL OFFSET as (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /**
     * Maximum number of session records to return per page. Minimum 1, maximum 100. Defaults to 20 when not specified.
     *
     * @x-autobe-specification Pagination control. Specifies the maximum number of records to return per page. Minimum 1, maximum 100. Default is 20 when null or omitted. Used in SQL LIMIT clause.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | null
      | undefined;

    /**
     * Column to sort session results by. Accepted values are 'created_at' (sort by session creation time) and 'expired_at' (sort by session expiration time). Defaults to 'created_at' when not specified.
     *
     * @x-autobe-specification Sorting control. Specifies the column to order results by. Allowed values: 'created_at' (session creation time), 'expired_at' (session expiration time). Default sort is 'created_at' when null or omitted. Used in SQL ORDER BY clause.
     */
    sort?: "created_at" | "expired_at" | null | undefined;

    /**
     * Sort order direction. Use 'asc' for ascending order and 'desc' for descending order. Defaults to 'desc' when not specified.
     *
     * @x-autobe-specification Sorting direction control. Specifies the order direction for the sort column. Allowed values: 'asc' (ascending), 'desc' (descending). Default is 'desc' when null or omitted. Used in SQL ORDER BY clause alongside sort field.
     */
    order?: "asc" | "desc" | null | undefined;
  };
}
