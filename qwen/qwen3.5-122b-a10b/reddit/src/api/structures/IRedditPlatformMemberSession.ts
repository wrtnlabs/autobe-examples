import { tags } from "typia";

import { IRedditPlatformMember } from "./IRedditPlatformMember";

export namespace IRedditPlatformMemberSession {
  /**
   * Query parameters for retrieving a filtered and paginated list of authenticated member's login sessions.
   *
   * This request type enables members to audit their session history and identify potentially unauthorized access by filtering sessions by IP address and creation/expiration date ranges. Pagination parameters control result set size for efficient data retrieval.
   *
   * All filtering is scoped to the authenticated member's sessions only, enforced by authorization middleware using JWT token claims. Members can only view their own sessions for security and privacy.
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-based index). Determines which page of results to retrieve.
     *
     * @x-autobe-specification Query parameter for pagination offset. 1-based page number. Implementation: Calculate offset as (page - 1) * limit. Default to 1 if not provided. Validate minimum value of 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of sessions per page (maximum 100). Controls the maximum number of results returned in a single response.
     *
     * @x-autobe-specification Query parameter for result set size. Range: 1-100. Implementation: Apply as LIMIT clause in SQL query. Validate bounds: minimum 1, maximum 100. Default to 10 if not provided.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter sessions by IP address (exact match or pattern). Enables members to identify sessions from specific devices or locations.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Filter parameter mapping to reddit_platform_member_sessions.ip column. Implementation: Apply WHERE ip LIKE or exact match filter. Supports IPv4 format. Case-insensitive comparison.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Filter sessions created on or after this timestamp. Enables filtering by session creation date range.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Filter parameter for created_at column range query. Implementation: Apply WHERE created_at >= created_at_from condition. ISO 8601 date-time format. Optional parameter.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created on or before this timestamp. Enables filtering by session creation date range.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Filter parameter for created_at column range query. Implementation: Apply WHERE created_at <= created_at_to condition. ISO 8601 date-time format. Optional parameter.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions expiring on or after this timestamp. Enables filtering by session expiration date range.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Filter parameter for expired_at column range query. Implementation: Apply WHERE expired_at >= expired_at_from condition. ISO 8601 date-time format. Optional parameter.
     */
    expired_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions expiring on or before this timestamp. Enables filtering by session expiration date range.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Filter parameter for expired_at column range query. Implementation: Apply WHERE expired_at <= expired_at_to condition. ISO 8601 date-time format. Optional parameter.
     */
    expired_at_to?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Summary representation of a JWT authentication session for a member account.
   *
   * This type provides session metadata for security monitoring and session management purposes, including connection details such as client IP address, access URL, referrer information, and session timestamps. Sensitive token data (access tokens and refresh tokens) are intentionally excluded from this summary to maintain security.
   *
   * Sessions represent authenticated login sessions that enable members to access the platform. Each session contains connection metadata for audit trail purposes and can be viewed by the member to monitor for suspicious activity. Multiple concurrent sessions are supported per the platform's session policy.
   *
   * This summary type is used in session list operations and single session retrieval endpoints, providing sufficient information for session management without exposing sensitive authentication credentials.
   */
  export type ISummary = {
    /**
     * Unique identifier for this authentication session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.id. Primary key, UUID format, required.
     */
    id: string & tags.Format<"uuid">;

    /**
     * IP address of the client that created this session.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.ip. IPv4 address format, captured at session creation for audit trail.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * Current page URL (href) where the session was created.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.href. URI format, current page URL where session was created.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that led to the session creation, or null if not available.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.referrer. URI format, nullable. Referrer URL that led to session creation.
     */
    referrer: (string & tags.Format<"uri">) | null;

    /**
     * Timestamp when this session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.created_at. Date-time format, timestamp when session was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session expires, used for automatic session cleanup and security.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.expired_at. Date-time format, timestamp when session expires for automatic cleanup.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Member account that owns this session.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Relation from reddit_platform_member_sessions.member to reddit_platform_members. JOIN via reddit_platform_member_id foreign key. Returns IRedditPlatformMember.ISummary with member profile information.
     */
    member: IRedditPlatformMember.ISummary;
  };
}
