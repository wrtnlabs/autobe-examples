import { tags } from "typia";

import { IDiscussionBoardMember } from "./IDiscussionBoardMember";

export namespace IDiscussionBoardGuestSession {
  /**
   * Unified session summary representing login sessions from all user types (members, administrators, and guests). Each record contains connection metadata including IP address, page URL, referrer URL, creation timestamp, and expiration time for security auditing and session management purposes. This summary type is used in paginated list responses for administrator session monitoring across the platform. It includes a type discriminator to distinguish between the three session categories, along with associated user information.
   */
  export type ISummary = {
    /**
     * Unique session identifier.
     *
     * @x-autobe-specification Direct mapping from session table id column via UNION: discussion_board_member_sessions.id, discussion_board_admin_sessions.id, or discussion_board_guest_sessions.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Session type discriminator indicating the user category (member, admin, or guest).
     *
     * @x-autobe-specification Computed discriminator based on UNION query source table: 'member' from discussion_board_member_sessions, 'admin' from discussion_board_admin_sessions, 'guest' from discussion_board_guest_sessions.
     */
    type: "member" | "admin" | "guest";

    /**
     * Client IP address for connection tracking and security auditing.
     *
     * @x-autobe-specification Direct mapping from session table ip column via UNION: discussion_board_member_sessions.ip, discussion_board_admin_sessions.ip, or discussion_board_guest_sessions.ip. IPv4 format.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * Current page URL where authentication occurred.
     *
     * @x-autobe-specification Direct mapping from session table href column via UNION: discussion_board_member_sessions.href, discussion_board_admin_sessions.href, or discussion_board_guest_sessions.href. URI format.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the page that led to authentication.
     *
     * @x-autobe-specification Direct mapping from session table referrer column via UNION: discussion_board_member_sessions.referrer, discussion_board_admin_sessions.referrer, or discussion_board_guest_sessions.referrer. Nullable URI format.
     */
    referrer?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Associated user information for this session.
     *
     * @x-autobe-specification JOIN with corresponding user table based on session type: discussion_board_members for member sessions, discussion_board_admins for admin sessions, discussion_board_guests for guest sessions. Returns IDiscussionBoardMember.ISummary with display_name and email.
     */
    user: IDiscussionBoardMember.ISummary;

    /**
     * Session creation timestamp marking when the user logged in.
     *
     * @x-autobe-specification Direct mapping from session table created_at column via UNION: discussion_board_member_sessions.created_at, discussion_board_admin_sessions.created_at, or discussion_board_guest_sessions.created_at. Timestamp with timezone.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Session expiration timestamp for automatic logout enforcement.
     *
     * @x-autobe-specification Direct mapping from session table expired_at column via UNION: discussion_board_member_sessions.expired_at, discussion_board_admin_sessions.expired_at, or discussion_board_guest_sessions.expired_at. Timestamp with timezone.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for filtering and paginating the unified session list across all user types (members, administrators, and guests).
   *
   * This DTO provides comprehensive session monitoring capabilities for administrators, allowing flexible filtering by session type, specific user identifier, IP address, creation date range, and expiration status. All filtering parameters are optional to support diverse query patterns.
   *
   * Pagination parameters (page, limit) control result set size and offset. Sorting parameters (sort_by, order) customize result order with creation time descending as the default.
   *
   * Used by the PATCH /discussionBoard/member/sessions endpoint to retrieve paginated session summaries with associated user information for security auditing, activity monitoring, and anomaly detection.
   */
  export type IRequest = {
    /**
     * Filter by session type: member, admin, or guest
     *
     * @x-autobe-specification Filter value for session_type UNION discriminator. Accepts 'member', 'admin', or 'guest'. Applied as WHERE session_type IN (...) clause in merged session query.
     */
    session_type?: "member" | "admin" | "guest" | undefined;

    /**
     * Filter by member ID
     *
     * @x-autobe-specification Filter value for discussion_board_member_sessions.member_id equality check. When provided, restricts results to sessions for the specified member.
     */
    member_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by admin ID
     *
     * @x-autobe-specification Filter value for discussion_board_admin_sessions.admin_id equality check. When provided, restricts results to sessions for the specified administrator.
     */
    admin_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by guest ID
     *
     * @x-autobe-specification Filter value for discussion_board_guest_sessions.guest_id equality check. When provided, restricts results to sessions for the specified guest.
     */
    guest_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by IP address (exact match or prefix)
     *
     * @x-autobe-specification Filter value for session ip column using LIKE match for exact or prefix matching. Applied to all three session tables in UNION query.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Filter sessions created on or after this timestamp
     *
     * @x-autobe-specification Lower bound for created_at BETWEEN filter. When provided, includes only sessions created on or after this timestamp. Nullable to allow optional filtering.
     */
    created_at_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter sessions created on or before this timestamp
     *
     * @x-autobe-specification Upper bound for created_at BETWEEN filter. When provided, includes only sessions created on or before this timestamp. Nullable to allow optional filtering.
     */
    created_at_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter by expiration status: true for expired, false for active, null for all
     *
     * @x-autobe-specification Filter value for expired status comparison. true returns expired sessions (expired_at < NOW()), false returns active sessions (expired_at >= NOW()), null returns all sessions. Nullable to allow optional filtering.
     */
    expired?: boolean | null | undefined;

    /**
     * Field to sort by: created_at, expired_at, ip
     *
     * @x-autobe-specification Field name for ORDER BY clause. Accepts 'created_at', 'expired_at', or 'ip'. Controls which session property determines result ordering.
     */
    sort_by?: "created_at" | "expired_at" | "ip" | undefined;

    /**
     * Sort order: asc or desc
     *
     * @x-autobe-specification Sort direction for ORDER BY clause. 'asc' for ascending, 'desc' for descending. Default is 'desc' for created_at.
     */
    order?: "asc" | "desc" | undefined;

    /**
     * Page number for pagination (1-indexed)
     *
     * @x-autobe-specification Page number for offset pagination (1-indexed). Used to calculate OFFSET = (page - 1) * limit. Minimum value is 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page
     *
     * @x-autobe-specification Maximum number of records per page. Used as LIMIT in SQL query. Range: 1-100. Controls payload size for pagination.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
