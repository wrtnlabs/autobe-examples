import { tags } from "typia";

export namespace IDiscussionBoardAdminSession {
  /**
   * Lightweight session summary for administrative monitoring and audit purposes. Provides essential session metadata including user identification, connection information, and temporal fields. Used in paginated session lists for security monitoring and compliance reporting.
   */
  export type ISummary = {
    /**
     * Unique session identifier.
     *
     * @x-autobe-specification Maps to id column from discussion_board_member_sessions, discussion_board_admin_sessions, or discussion_board_guest_sessions depending on userType. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of user account associated with this session.
     *
     * @x-autobe-specification Computed from source table: 'member' if from discussion_board_member_sessions, 'admin' if from discussion_board_admin_sessions, 'guest' if from discussion_board_guest_sessions. Used to determine which table to join for displayName.
     */
    userType: "member" | "admin" | "guest";

    /**
     * User's display name (or 'Guest' for guest sessions).
     *
     * @x-autobe-specification For member sessions: join discussion_board_member_sessions.member_id to discussion_board_members.id, return display_name. For admin sessions: join discussion_board_admin_sessions.admin_id to discussion_board_admins.id, return display_name. For guest sessions: return 'Guest'.
     */
    displayName: string;

    /**
     * IP address from which the session was created.
     *
     * @x-autobe-specification Maps to ip column from discussion_board_member_sessions, discussion_board_admin_sessions, or discussion_board_guest_sessions. Captured at session creation time.
     */
    ipAddress: string;

    /**
     * Timestamp when the session was created.
     *
     * @x-autobe-specification Maps to created_at column from discussion_board_member_sessions, discussion_board_admin_sessions, or discussion_board_guest_sessions. ISO 8601 date-time format.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session expires or expired.
     *
     * @x-autobe-specification Maps to expired_at column from discussion_board_member_sessions, discussion_board_admin_sessions, or discussion_board_guest_sessions. ISO 8601 date-time format. Used to compute status field.
     */
    expiredAt: string & tags.Format<"date-time">;

    /**
     * Current session status based on expiration time.
     *
     * @x-autobe-specification Computed from expiredAt: 'active' if expiredAt > current time, 'expired' if expiredAt <= current time. Not stored in database.
     */
    status: "active" | "expired";
  };

  /**
   * Query parameters for filtering and paginating user session records across the discussion board platform. Supports searching by user identifier, IP address, session status, and temporal ranges. All parameters are optional to enable flexible query combinations for administrative session monitoring and audit purposes.
   */
  export type IRequest = {
    /**
     * General text search across user display names and identifiers for finding sessions by user.
     *
     * @x-autobe-specification Text search filter applied to user display names from discussion_board_members and discussion_board_admins tables via JOIN. Uses LIKE operator for partial matching. Not stored in session tables.
     */
    search?: string | undefined;

    /**
     * Filter sessions by specific user UUID (member, admin, or guest identifier).
     *
     * @x-autobe-specification Exact UUID match filter on member_id (discussion_board_member_sessions), admin_id (discussion_board_admin_sessions), or guest_id (discussion_board_guest_sessions). Used to find all sessions for a specific user.
     */
    user_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter sessions by IP address partial match for security monitoring.
     *
     * @x-autobe-specification Partial match filter on ip_address column in session tables. Uses LIKE operator for substring matching. Supports security monitoring by IP.
     */
    ip?: string | undefined;

    /**
     * Filter by session status: active (not yet expired) or expired based on expiration time.
     *
     * @x-autobe-specification Computed filter: 'active' means expired_at > current timestamp, 'expired' means expired_at <= current timestamp. Status is derived from expired_at comparison, not stored.
     */
    status?: "active" | "expired" | undefined;

    /**
     * Filter sessions created on or after this ISO 8601 timestamp.
     *
     * @x-autobe-specification Range filter on created_at timestamp. Returns sessions where created_at >= provided value. ISO 8601 datetime format.
     */
    created_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created on or before this ISO 8601 timestamp.
     *
     * @x-autobe-specification Range filter on created_at timestamp. Returns sessions where created_at <= provided value. ISO 8601 datetime format.
     */
    created_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions expiring on or after this ISO 8601 timestamp.
     *
     * @x-autobe-specification Range filter on expired_at timestamp. Returns sessions where expired_at >= provided value. ISO 8601 datetime format.
     */
    expired_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions expiring on or before this ISO 8601 timestamp.
     *
     * @x-autobe-specification Range filter on expired_at timestamp. Returns sessions where expired_at <= provided value. ISO 8601 datetime format.
     */
    expired_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination (1-indexed, defaults to 1).
     *
     * @x-autobe-specification 1-indexed page number for pagination. Defaults to 1 if not provided. Used with limit to calculate OFFSET for SQL query.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page (minimum 1, maximum 100).
     *
     * @x-autobe-specification Number of items per page. Minimum 1, maximum 100. Defaults to reasonable value if not provided. Used with page to calculate LIMIT for SQL query.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by: created_at or expired_at.
     *
     * @x-autobe-specification Field name for ORDER BY clause. Valid values: 'created_at' or 'expired_at'. Defaults to 'created_at' if not provided.
     */
    sort?: "created_at" | "expired_at" | undefined;

    /**
     * Sort direction: asc (ascending) or desc (descending, default).
     *
     * @x-autobe-specification Sort direction for ORDER BY clause. Valid values: 'asc' (ascending) or 'desc' (descending). Defaults to 'desc' if not provided.
     */
    direction?: "asc" | "desc" | undefined;
  };
}
