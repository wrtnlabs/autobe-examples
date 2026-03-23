import { tags } from "typia";

import { IHrmPlatformGuest } from "./IHrmPlatformGuest";

export namespace IHrmPlatformGuestSession {
  /**
   * Query parameters for filtering and paginating guest session records. Use these optional parameters to search for specific guest sessions by status, date range, IP address, or text content. Omit all fields to retrieve all sessions with default pagination settings.
   */
  export type IRequest = {
    /**
     * Page number for pagination (default: 1).
     *
     * @x-autobe-specification Pagination page number. Default value is 1. Minimum value is 1. Used to calculate OFFSET in SQL query as (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page (default: 20, max: 100).
     *
     * @x-autobe-specification Number of records per page. Default value is 20. Minimum is 1, maximum is 100. Used as LIMIT clause in SQL query to control result set size.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter by session status: 'active' for sessions with null expired_at, 'expired' for sessions with expired_at set.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Filter by session expiration status. 'active' translates to WHERE expired_at IS NULL. 'expired' translates to WHERE expired_at IS NOT NULL. This computed filter determines if the session is still valid or has expired.
     */
    status?: "active" | "expired" | undefined;

    /**
     * Filter sessions created on or after this timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Filter sessions created on or after this timestamp. Applied as WHERE created_at >= value in SQL query. Accepts ISO 8601 date-time format string.
     */
    created_at_start?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created on or before this timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Filter sessions created on or before this timestamp. Applied as WHERE created_at <= value in SQL query. Accepts ISO 8601 date-time format string.
     */
    created_at_end?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by exact IP address.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Filter by exact IP address match. Applied as WHERE ip = value in SQL query. Accepts IPv4 format string (e.g., '192.168.1.1').
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Text search across ip, href, and referrer fields.
     *
     * @x-autobe-specification Text search across multiple fields (ip, href, referrer). Applied as WHERE (ip LIKE %value% OR href LIKE %value% OR referrer LIKE %value%) in SQL query. Performs case-insensitive partial matching.
     */
    search?: string | undefined;
  };

  /**
   * Lightweight summary of a guest session for display in paginated lists. Guest sessions are temporary authentication states for unauthenticated visitors, tracking connection metadata such as IP address, referrer URLs, and session lifecycle timestamps. The expired_at field indicates session status - null means the session is still active, while a timestamp indicates the session has expired.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from hrm_platform_guest_sessions.id. Primary key UUID identifying the guest session.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The guest actor associated with this session.
     *
     * @x-autobe-database-schema-property guest
     * @x-autobe-specification Relation join from hrm_platform_guest_sessions.hrm_platform_guest_id to hrm_platform_guests.id. Returns IHrmPlatformGuest.ISummary object.
     */
    guest: IHrmPlatformGuest.ISummary;

    /**
     * IP address of the guest during session creation.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from hrm_platform_guest_sessions.ip. Stores the IP address of the guest during session creation for security monitoring.
     */
    ip: string;

    /**
     * The URL where the guest initiated the session.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from hrm_platform_guest_sessions.href. URI format, stores the URL where the guest initiated the session.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referrer URL that led the guest to the current page. Null if no referrer.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from hrm_platform_guest_sessions.referrer. Nullable URI format, stores the referrer URL that led the guest to the current page.
     */
    referrer: (string & tags.Format<"uri">) | null;

    /**
     * Timestamp when the guest session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from hrm_platform_guest_sessions.created_at. DateTime format (RFC 3339), timestamp when the guest session was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the guest session expires. Null if session is still active.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from hrm_platform_guest_sessions.expired_at. Nullable DateTime format (RFC 3339). Null means session is still active, timestamp indicates session has expired.
     */
    expired_at: (string & tags.Format<"date-time">) | null;
  };
}
