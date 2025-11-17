import { tags } from "typia";

export namespace ICommunityForumCommunityModeratorSession {
  /**
   * Authentication session for a community forum moderator.
   *
   * This type represents a moderator's active session in the community forum
   * platform. It contains information about how and when the moderator
   * authenticated, including connection context such as IP address, referring
   * URL, and session creation timestamp. The session also tracks its
   * expiration time, which when null indicates an active session.
   *
   * Moderator sessions provide an audit trail of moderator activities and
   * allow the system to track which moderator performed specific actions
   * during a particular session. This is essential for accountability in
   * community moderation.
   */
  export type ISummary = {
    /**
     * Unique identifier for the moderator session.
     *
     * This is the primary key that uniquely identifies each moderator
     * session in the system. It's a UUID generated when the session is
     * created and is used to track all activities performed by the
     * moderator during this specific session.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reference to the moderator who owns this session.
     *
     * This foreign key links the session to a specific moderator in the
     * community_forum_moderators table. It identifies which moderator
     * account this session belongs to, allowing the system to associate
     * actions with the correct user.
     */
    community_forum_moderator_id: string & tags.Format<"uuid">;

    /**
     * IP address from which the session was initiated.
     *
     * This field captures the network address of the client device that
     * initiated the moderator session. It's used for security monitoring,
     * fraud detection, and can help identify potential security issues such
     * as sessions originating from unexpected locations.
     */
    ip: string;

    /**
     * Connection URL used to establish the session.
     *
     * This field records the exact URL that was accessed when the moderator
     * session was created. It provides context about how the moderator
     * accessed the system, which can be useful for understanding user
     * behavior and troubleshooting access issues.
     */
    href: string;

    /**
     * Referrer URL that led to the session creation.
     *
     * This field captures the URL of the page that referred the moderator
     * to the session creation point. It helps understand the user journey
     * and can be valuable for UX analysis and identifying which paths
     * moderators typically take to access the system.
     */
    referrer: string;

    /**
     * Timestamp when the session was created.
     *
     * This field records the exact date and time when the moderator session
     * was established. It's essential for session lifetime management,
     * audit trails, and understanding moderator activity patterns.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session expires or expired.
     *
     * This field indicates when the moderator session will or has expired.
     * When this value is null, it signifies that the session is currently
     * active and has not yet expired or been terminated. When populated
     * with a timestamp, it indicates the session's expiration time or that
     * the session has already expired.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Request parameters for filtering and paginating moderator sessions.
   *
   * This DTO defines the search criteria and pagination controls for
   * retrieving lists of moderator sessions. It supports filtering by session
   * status, time ranges, and sorting options.
   *
   * Designed for use with paginated endpoints that need to display filtered
   * lists of moderator authentication sessions for administrative or audit
   * purposes.
   */
  export type IRequest = {
    /**
     * Page number for pagination controls.
     *
     * Specifies which page of results to retrieve, with page 1 being the
     * first page. Must be a positive integer value.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of items to retrieve per page.
     *
     * Controls the page size for result sets, limiting the number of
     * records returned in a single response. Must be between 1 and 100
     * items per page.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Sorting criteria for the session list.
     *
     * Determines the order in which sessions are returned. Valid values are
     * 'created_at:asc' for oldest first or 'created_at:desc' for newest
     * first.
     */
    sort?: "created_at:asc" | "created_at:desc" | undefined;

    /**
     * Filter sessions by their current status.
     *
     * Allows filtering the session list to show only active sessions (where
     * expired_at is null) or expired sessions (where expired_at has a
     * value).
     */
    status?: "active" | "expired" | undefined;

    /**
     * Filter sessions created after this timestamp.
     *
     * Only sessions created after this specific date and time will be
     * included in results, in ISO 8601 format.
     */
    created_after?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created before this timestamp.
     *
     * Only sessions created before this specific date and time will be
     * included in results, in ISO 8601 format.
     */
    created_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions that expired after this timestamp.
     *
     * Only sessions with expiration timestamps after this value will be
     * included in results, in ISO 8601 format.
     */
    expired_after?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions that expired before this timestamp.
     *
     * Only sessions with expiration timestamps before this value will be
     * included in results, in ISO 8601 format.
     */
    expired_before?: (string & tags.Format<"date-time">) | undefined;
  };
}
