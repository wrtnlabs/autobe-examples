import { tags } from "typia";

export namespace ICommunityForumCommunityUserSession {
  /**
   * Request parameters for searching and filtering user sessions.
   *
   * This interface defines the search criteria and pagination parameters for
   * filtering user sessions. It allows administrators and users to query
   * sessions based on various attributes such as IP address, connection URL,
   * referrer URL, and time ranges.
   *
   * The pagination parameters (page and limit) are required for efficient
   * data retrieval. Sorting options allow ordering results by creation date
   * or other attributes. Time-based filters help identify sessions within
   * specific periods, while the active_only flag enables quick filtering of
   * currently valid sessions.
   */
  export type IRequest = {
    /** Page number for pagination. */
    page: number & tags.Type<"int32">;

    /** Number of items per page. */
    limit: number & tags.Type<"int32">;

    /** Sorting criteria. */
    sort?: string | undefined;

    /** Sort order (ascending or descending). */
    order?: "asc" | "desc" | undefined;

    /** Filter sessions by IP address. */
    ip?: string | undefined;

    /** Filter sessions by connection URL. */
    href?: string | undefined;

    /** Filter sessions by referrer URL. */
    referrer?: string | undefined;

    /** Filter sessions created after this timestamp. */
    created_after?: (string & tags.Format<"date-time">) | undefined;

    /** Filter sessions created before this timestamp. */
    created_before?: (string & tags.Format<"date-time">) | undefined;

    /** Filter to show only active sessions. */
    active_only?: boolean | undefined;
  };

  /**
   * Summary representation of a user authentication session for context and
   * security displays.
   *
   * This lightweight session summary provides essential security and context
   * information without exposing user identity or detailed connection data.
   * It's designed for optimal performance in security displays, device
   * listings, and administrative views.
   *
   * The summary includes:
   *
   * - Session's unique identifier (UUID)
   * - IP address where session was initiated (for security verification)
   * - Session creation timestamp (for display ordering)
   * - Expiration status (active vs expired sessions)
   *
   * This summary is used in:
   *
   * - User's active sessions list
   * - Account security dashboards
   * - Administrative session monitoring
   * - Login history displays
   * - Device management interfaces
   *
   * Sensitive fields like user identity linkage (community_forum_user_id),
   * connection URLs (href), and referrer information are excluded from
   * summary representations for security and privacy reasons.
   */
  export type ISummary = {
    /** Primary Key. */
    id: string & tags.Format<"uuid">;

    /** IP address from which the session was initiated. */
    ip: string;

    /** Timestamp when the session was created. */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session expires or expired. Null indicates an
     * active session.
     */
    expired_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
