import { tags } from "typia";

import { IRedditCommunityMember } from "./IRedditCommunityMember";

export namespace IRedditCommunityMemberSession {
  /**
   * Complete member session entity with authentication metadata.
   *
   * Represents a logged-in session with JWT token information, client details, and lifecycle tracking. This DTO is used for viewing active sessions and session management in API responses.
   *
   * The session record tracks the member's authentication state including unique identifier, associated member reference, client IP address, last visited page, HTTP referrer, and all relevant timestamps for creation, updates, and expiration.
   */
  export type IFull = {
    /**
     * Unique identifier for the session record.
     *
     * This is the primary key used to identify and reference a specific session. It is a UUID that uniquely identifies the session across the entire system.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The member account associated with this session.
     *
     * This is the member entity referenced by reddit_community_member_id. It contains the member's profile information including username and timestamps.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Join from reddit_community_member_sessions.member relation to reddit_community_members. Returns IRedditCommunityMember.ISummary for the member profile.
     */
    member: IRedditCommunityMember.ISummary;

    /**
     * IP address of the client when the session was created.
     *
     * This optional field captures the IP address from which the member logged in. It is used for security monitoring and detecting suspicious session activity from unusual locations.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.ip. Optional string in IPv4 format representing the client's IP address when session was created.
     */
    ip: string | null;

    /**
     * Last known URL accessed by the member during this session.
     *
     * This optional field tracks the last page or endpoint the member visited while using this session. It helps track session activity and can be used for audit purposes.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.href. Optional string representing the last known URL accessed by the member during this session.
     */
    href: string | null;

    /**
     * HTTP referrer header value from the request that created the session.
     *
     * This optional field provides context about how the member arrived at the application, such as the referring website or previous page that initiated the login.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.referrer. Optional string containing the HTTP referrer header value from the request that created the session.
     */
    referrer: string | null;

    /**
     * Timestamp when the session was created and the member logged in.
     *
     * This required field marks the exact moment the member authenticated and established this session. It is used for calculating session age and determining validity.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.created_at. DateTime in date-time format representing when the session was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session was last updated with activity.
     *
     * This required field is refreshed on each authenticated request to track session freshness. It helps determine when the session was last actively used.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.updated_at. DateTime in date-time format representing when the session was last updated.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session expires and becomes invalid.
     *
     * This required field defines the expiration boundary for the session. Sessions must have explicit expiration for security purposes and automatic cleanup of stale sessions.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.expired_at. DateTime in date-time format representing when the session expires and becomes invalid.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session was soft-deleted.
     *
     * This optional field is used for session cleanup while preserving audit trail. A null value indicates the session is active, while a timestamp indicates it has been logically deleted.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.deleted_at. Optional DateTime in date-time format for session soft deletion. Null if session is active.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Member session summary for pagination and list views.
   *
   * Provides essential session metadata for security auditing and session management, including the session identifier, associated member reference, client information, and lifecycle timestamps. Each summary represents one login session with its IP address, last visited page, and expiration status.
   */
  export type ISummary = {
    /**
     * Unique identifier for the member session.
     *
     * A UUID that uniquely identifies this specific login session across the system. Used for session management, reference in other operations, and audit tracking.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Identifier of the member who owns this session.
     *
     * A UUID reference to the member account that created this session. This is a direct FK lookup (not a nested object), allowing efficient session list queries while maintaining referential integrity to the member.
     *
     * @x-autobe-database-schema-property reddit_community_member_id
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.reddit_community_member_id. Foreign key reference to the member who owns this session.
     */
    redditCommunityMemberId: string & tags.Format<"uuid">;

    /**
     * IP address of the client when the session was created.
     *
     * The IP address from which the member logged in. Used for security monitoring, detecting suspicious activity from unusual locations, and providing session context. May be null in some cases.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.ip. Stores the client IP address when the session was created.
     */
    ip: string | null;

    /**
     * Last known URL accessed by the member during this session.
     *
     * The URL from the browser that was captured when the session was created. Provides context about where the member was on the site and can be used for session activity tracking. May be null if not captured.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.href. Stores the last known URL accessed during the session.
     */
    href: string | null;

    /**
     * HTTP referrer header from the request that created the session.
     *
     * The referrer value indicating how the member arrived at the application (e.g., from another website, a search engine, or a direct link). Provides contextual information about the session origin. May be null if not captured.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.referrer. Stores the HTTP referrer header value from the login request.
     */
    referrer: string | null;

    /**
     * Timestamp when the session was created and the member logged in.
     *
     * The exact date and time (in UTC) when the member successfully authenticated and established this session. Used for calculating session age, determining validity, and audit tracking.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.created_at. ISO 8601 formatted timestamp with timezone.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session was last updated with activity.
     *
     * The most recent date and time (in UTC) when this session was accessed or updated. Refreshed on each authenticated request to track session freshness and detect inactivity.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.updated_at. ISO 8601 formatted timestamp with timezone.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session expires and becomes invalid.
     *
     * The date and time (in UTC) when the session will no longer be valid. Used for automatic cleanup of stale sessions and determining whether the session is still active. Always present for security enforcement.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.expired_at. ISO 8601 formatted timestamp with timezone.
     */
    expiredAt: string & tags.Format<"date-time">;
  };

  /**
   * Search criteria for filtering and paginating member sessions.
   *
   * This request body defines how to query member session records with flexible pagination, sorting, and filtering capabilities. Used when listing sessions for security auditing, session management, or activity monitoring purposes.
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-indexed).
     *
     * Specifies which page of results to return when paginating through the session list. Page numbering starts from 1, not 0, so page 1 represents the first page of results.
     *
     * @x-autobe-specification 1-indexed page number for pagination. Page 1 returns the first page of results. Validation: must be >= 1. Default: 1 if not provided. No direct DB mapping - client-side pagination control.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of results per page (1-100).
     *
     * Defines the maximum number of session records to include in a single page response. Smaller values reduce response size; larger values reduce the number of API calls needed to fetch all results.
     *
     * @x-autobe-specification Maximum number of records to return per page (1-100). Used together with page for cursor-based pagination. Validation: must be between 1 and 100 inclusive. Default: 20 if not provided. No direct DB mapping - controls result set size.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by.
     *
     * Determines which column or field the results will be ordered on. Combined with sortOrder, this controls whether results appear from oldest to newest (asc) or newest to oldest (desc), or from A to Z / Z to A.
     *
     * @x-autobe-specification Field name to sort results by. Valid values: 'created_at' (sort by session creation time from created_at column), 'expired_at' (sort by session expiration time from expired_at column), 'ip' (sort by client IP address from ip column). Must be used with sortOrder to define ascending or descending order.
     */
    sortField?: "created_at" | "expired_at" | "ip" | undefined;

    /**
     * Sort order (ascending or descending).
     *
     * Controls whether results are sorted in ascending order (oldest first, A→Z) or descending order (newest first, Z→A). Works together with sortField to determine the final order of returned records.
     *
     * @x-autobe-specification Sort direction: 'asc' for ascending (oldest/earliest first), 'desc' for descending (newest/latest first). Must be used with sortField to define complete sort behavior. Controls the ORDER BY direction in database queries.
     */
    sortOrder?: "asc" | "desc" | undefined;

    /**
     * Filter by specific member ID.
     *
     * Limits results to sessions associated with the specified member account. The value must be a valid UUID format matching the reddit_community_member_id column in the database.
     *
     * @x-autobe-specification UUID filter that matches exact session records where reddit_community_member_id equals the provided UUID value. Used to retrieve only sessions belonging to a specific member account. Database query: WHERE reddit_community_member_id = :memberId
     */
    memberId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by IP address (partial match supported).
     *
     * Searches for sessions where the IP address contains the provided string pattern. Useful for finding sessions from a particular IP address or IP range. Maximum 45 characters to accommodate IPv6 addresses.
     *
     * @x-autobe-specification Partial match LIKE filter on the ip column. Supports substring matching to find sessions from a specific IP address or IP range. The value is wrapped with % wildcards for flexible matching. Database query: WHERE ip LIKE :ipAddress
     */
    ipAddress?: (string & tags.MinLength<1> & tags.MaxLength<45>) | undefined;

    /**
     * Filter by session status.
     *
     * Classifies sessions by their current lifecycle state. 'Active' sessions are valid and usable. 'Expired' sessions have passed their expiration time. 'Revoked' sessions were manually terminated or deleted. Filter narrows results to sessions matching the specified status.
     *
     * @x-autobe-specification Computed filter based on session lifecycle state:
     * - 'active': deleted_at IS NULL AND expired_at > NOW()
     * - 'expired': expired_at <= NOW()
     * - 'revoked': deleted_at IS NOT NULL
     *
     * Logic evaluates session validity and termination state at query time. Database query: WHERE (deleted_at IS NULL AND expired_at > NOW()) OR (expired_at <= NOW()) OR (deleted_at IS NOT NULL)
     */
    status?: "active" | "expired" | "revoked" | undefined;

    /**
     * Filter sessions created after this date.
     *
     * Returns only sessions that were created (logged in) after the specified date and time. Useful for finding recent sessions within a particular time window.
     *
     * @x-autobe-specification Filter sessions where created_at >= provided date-time value. Used to find sessions created after a specific point in time. Accepts ISO 8601 date-time format. Database query: WHERE created_at >= :createdAfter
     */
    createdAfter?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created before this date.
     *
     * Returns only sessions that were created (logged in) before the specified date and time. Useful for finding older sessions within a particular time window.
     *
     * @x-autobe-specification Filter sessions where created_at <= provided date-time value. Used to find sessions created before a specific point in time. Accepts ISO 8601 date-time format. Database query: WHERE created_at <= :createdBefore
     */
    createdBefore?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions with expiration after this date.
     *
     * Returns only sessions whose expiration timestamp is later than the specified date and time. Useful for finding sessions that are still valid beyond a certain point.
     *
     * @x-autobe-specification Filter sessions where expired_at >= provided date-time value. Used to find sessions that will expire after a specific point in time. Accepts ISO 8601 date-time format. Database query: WHERE expired_at >= :expiredAfter
     */
    expiredAfter?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions with expiration before this date.
     *
     * Returns only sessions whose expiration timestamp is earlier than the specified date and time. Useful for finding sessions that have already expired or will expire soon.
     *
     * @x-autobe-specification Filter sessions where expired_at <= provided date-time value. Used to find sessions that will expire before a specific point in time. Accepts ISO 8601 date-time format. Database query: WHERE expired_at <= :expiredBefore
     */
    expiredBefore?: (string & tags.Format<"date-time">) | undefined;
  };
}
