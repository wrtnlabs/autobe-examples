import { tags } from "typia";

import { IPage } from "./IPage";

export namespace IRedditPlatformMemberSession {
  /**
   * Lightweight session summary for listing and display purposes. Contains essential session metadata including identification, connection details, and lifecycle timestamps. Used in paginated session list responses to allow users to view and manage their login sessions across devices.
   */
  export type ISummary = {
    /**
     * Unique session identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * ID of the member who owns this session.
     *
     * @x-autobe-database-schema-property member_id
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.member_id. FK to reddit_platform_members.id.
     */
    member_id: string & tags.Format<"uuid">;

    /**
     * IP address of the client that created this session.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.ip. IPv4 address captured at session creation.
     */
    ip: string;

    /**
     * The last page URL visited by the member during this session.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.href. The last page URL visited during this session.
     */
    href: string | null;

    /**
     * The incoming referrer URL that brought the member to the platform.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.referrer. The incoming referrer URL that brought the member to the platform.
     */
    referrer: string | null;

    /**
     * Timestamp when this session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.created_at. ISO 8601 formatted timestamp.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session expires.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.expired_at. ISO 8601 formatted timestamp when session expires.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for listing member login sessions with pagination, sorting, and filtering capabilities.
   *
   * Allows users to view their session history with options to filter by status (active/expired), date ranges, IP address, and connection metadata. Results can be sorted by creation or expiration date.
   */
  export type IRequest = {
    pagination?: IPage.IPagination | undefined;

    /**
     * Field to sort results by
     */
    sort?: "created_at" | "expired_at" | undefined;

    /**
     * Sort direction (default: DESC)
     */
    direction?: "ASC" | "DESC" | undefined;

    /**
     * Filter sessions by status: active (not expired) or expired
     */
    status?: "active" | "expired" | undefined;

    /**
     * Filter sessions created after this datetime
     */
    created_since?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created before this datetime
     */
    created_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions expired after this datetime
     */
    expired_since?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions expired before this datetime
     */
    expired_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * IP address substring match (case-insensitive)
     *
     * @x-autobe-database-schema-property ip
     */
    ip?: (string & tags.MaxLength<45>) | undefined;

    /**
     * Last visited page URL substring match
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.href. Nullable: can be null if not set. Case-insensitive LIKE substring match.
     */
    href?: (string & tags.MaxLength<2083>) | null | undefined;

    /**
     * Incoming referrer URL substring match
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.referrer. Nullable: can be null if not set. Case-insensitive LIKE substring match.
     */
    referrer?: (string & tags.MaxLength<2083>) | null | undefined;

    /**
     * Target page number to retrieve (1-indexed).
     *
     * Specifies which page of results to return. Page numbering starts from 1.
     * If omitted, null, or undefined, defaults to page 1 (first page).
     * Requesting a page beyond the available range returns an empty data array
     * with valid pagination metadata reflecting the actual totals.
     *
     * @x-autobe-specification 1-indexed page number. Defaults to 1 if not provided.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * Controls how many records are included in each page response. If omitted,
     * null, or undefined, defaults to 100 records per page. The server may
     * enforce upper bounds to prevent excessive resource consumption on large
     * requests.
     *
     * @x-autobe-specification Maximum records per page. Defaults to 100 if not provided.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
