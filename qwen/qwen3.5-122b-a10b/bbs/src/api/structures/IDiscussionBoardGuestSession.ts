import { tags } from "typia";

import { IDiscussionBoardGuest } from "./IDiscussionBoardGuest";

export namespace IDiscussionBoardGuestSession {
  /**
   * Request parameters for searching and paginating guest session records.
   *
   * This DTO defines query criteria for retrieving guest sessions across the discussion board system. Supports filtering by session ID, guest user ID, IP address, and creation/expiration date ranges. Pagination parameters control result set size and page number, while sorting options allow ordering by creation time, expiration time, or IP address.
   *
   * Members can only view their own sessions due to authorization constraints.
   */
  export type IRequest = {
    /**
     * Filter by specific session ID.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Maps to discussion_board_guest_sessions.id. Exact match filter for specific session ID.
     */
    sessionId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by guest user ID (discussion_board_guest_id).
     *
     * @x-autobe-database-schema-property discussion_board_guest_id
     * @x-autobe-specification Maps to discussion_board_guest_sessions.discussion_board_guest_id. Exact match filter for guest account ID. Members can only query their own sessions.
     */
    userId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by client IP address.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Maps to discussion_board_guest_sessions.ip. Exact match filter for client IP address.
     */
    ipAddress?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Filter sessions created after this timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Maps to discussion_board_guest_sessions.created_at. Lower bound for creation timestamp range filter.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created before this timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Maps to discussion_board_guest_sessions.created_at. Upper bound for creation timestamp range filter.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions expiring after this timestamp.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Maps to discussion_board_guest_sessions.expired_at. Lower bound for expiration timestamp range filter.
     */
    expiredAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions expiring before this timestamp.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Maps to discussion_board_guest_sessions.expired_at. Upper bound for expiration timestamp range filter.
     */
    expiredAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination (1-based).
     *
     * @x-autobe-specification Query parameter for pagination. 1-based page number, default 1. Used with LIMIT/OFFSET in SQL query.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of records per page.
     *
     * @x-autobe-specification Query parameter for pagination. Records per page, range 1-100, default 30. Used with LIMIT in SQL query.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<30> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by.
     *
     * @x-autobe-specification Query parameter for sorting. Values: created_at, expired_at, or ip. Maps to ORDER BY clause in SQL query.
     */
    orderBy?: "created_at" | "expired_at" | "ip" | undefined;

    /**
     * Sort in descending order (true) or ascending order (false).
     *
     * @x-autobe-specification Query parameter for sort direction. Boolean, default true (descending). Maps to ORDER BY ... DESC or ASC in SQL query.
     */
    orderByDesc?: boolean | undefined;
  };

  /**
   * Summary representation of a guest session for listing and display purposes. Contains connection metadata including IP address, page context, and referrer information for security monitoring. Sessions are temporary tokens for anonymous browsing access, identified by device fingerprint for session continuity across requests.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_guest_sessions.id. Primary key UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Client IP address for the session connection.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from discussion_board_guest_sessions.ip. Client IP address for security auditing.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * Current page URL (href) when session was created.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from discussion_board_guest_sessions.href. Current page URL when session was created.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led to session creation.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from discussion_board_guest_sessions.referrer. Referrer URL that led to session creation.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Session creation timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_guest_sessions.created_at. Session creation timestamp with timezone.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Session expiration timestamp for security invalidation.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from discussion_board_guest_sessions.expired_at. Session expiration timestamp for invalidation.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Guest account this session belongs to.
     *
     * @x-autobe-database-schema-property guest
     * @x-autobe-specification BELONGS-TO relation via discussion_board_guest_id FK. JOIN to discussion_board_guests table returns IDiscussionBoardGuest.ISummary.
     */
    guest: IDiscussionBoardGuest.ISummary;
  };
}
