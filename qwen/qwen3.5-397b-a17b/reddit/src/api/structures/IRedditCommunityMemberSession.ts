import { tags } from "typia";

import { IRedditCommunityMember } from "./IRedditCommunityMember";

export namespace IRedditCommunityMemberSession {
  /**
   * Session metadata for member authentication including client context (IP, current page, referrer) and timing information (creation and expiration timestamps). Used for security monitoring and account audit. Excludes sensitive JWT tokens.
   */
  export type ISummary = {
    /**
     * Unique identifier for the authentication session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Client IP address at the time of session creation for security auditing.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.ip. Captured at session creation time.
     */
    ip: string;

    /**
     * Current page URL at the time of session creation.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.href. URI format. Captured at session creation time.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referring page URL at the time of session creation for tracking navigation source.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.referrer. URI format. Captured at session creation time.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Timestamp when the session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.created_at. ISO 8601 date-time format.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session expires and becomes invalid for authentication.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.expired_at. ISO 8601 date-time format. Session is invalid after this time.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * The member account associated with this session.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Relation mapping via reddit_community_member_id FK to reddit_community_members.id. Returns IRedditCommunityMember.ISummary with member account information.
     */
    member: IRedditCommunityMember.ISummary;
  };

  /**
   * Request parameters for filtering and paginating authenticated member sessions. Supports filtering by session status, IP address, and creation date range.
   */
  export type IRequest = {
    /**
     * Text search across session metadata including IP address, current page URL, and referrer.
     *
     * @x-autobe-specification Computed search parameter for text search across session metadata (ip, href, referrer). Implemented as LIKE pattern matching on multiple columns.
     */
    search?: string | undefined;

    /**
     * Filter by session status: active (expired_at > now) or expired (expired_at <= now).
     *
     * @x-autobe-specification Computed filter based on expired_at comparison with current timestamp. active=expired_at>now, expired=expired_at<=now.
     */
    status?: "active" | "expired" | undefined;

    /**
     * Filter by IP address or IP pattern.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.ip. Supports LIKE pattern matching for IP address filtering.
     */
    ip?: string | undefined;

    /**
     * Filter sessions created after this timestamp (inclusive).
     *
     * @x-autobe-specification Computed filter parameter for created_at lower bound. Filters sessions where created_at >= specified timestamp.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created before this timestamp (inclusive).
     *
     * @x-autobe-specification Computed filter parameter for created_at upper bound. Filters sessions where created_at <= specified timestamp.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination (1-indexed, defaults to 1).
     *
     * @x-autobe-specification Computed pagination parameter. 1-indexed page number, defaults to 1. Used with limit for offset calculation.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page (minimum 1, maximum 100).
     *
     * @x-autobe-specification Computed pagination parameter. Number of items per page, minimum 1, maximum 100. Defaults to 20 if not specified.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort field for results. Currently supports 'created_at' (descending by default).
     *
     * @x-autobe-specification Computed sort parameter. Currently only supports 'created_at'. Default sort order is descending (newest first).
     */
    sort?: "created_at" | undefined;
  };
}
