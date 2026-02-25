import { tags } from "typia";

import { IRedditMember } from "./IRedditMember";

export namespace IRedditMemberSession {
  /**
   * Session summary for audit logs, showing connection metadata (IP, navigation context) and associated member details for security and monitoring purposes. Optimized for quick display in session history lists, containing minimal data required for security analysis.
   */
  export type ISummary = {
    /**
     * Unique session identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_member_sessions.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Client IP address used for session tracking.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from reddit_member_sessions.ip.
     */
    ip: string;

    /**
     * Navigation reference URI used for this session.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from reddit_member_sessions.href.
     */
    href: string;

    /**
     * Previous page URL that originated this session.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from reddit_member_sessions.referrer.
     */
    referrer: string;

    /**
     * Session creation timestamp (UTC).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_member_sessions.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Session expiration timestamp (UTC).
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from reddit_member_sessions.expired_at.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Associated user account details.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Join via reddit_member_id. Returns IRedditMember.ISummary.
     */
    member: IRedditMember.ISummary;
  };

  /**
   * Query parameters for filtering and paginating session records in audit and security operations, including client IP, navigation context, temporal range filters, and pagination controls.
   */
  export type IRequest = {
    /**
     * Search term for filtering session records by text content.
     *
     * @x-autobe-specification Enables full-text search across ip, href, referrer, and created_at fields for session metadata. Not a direct DB column mapping.
     */
    search?: string | undefined;

    /**
     * Client IP address used to filter session records.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct filter on reddit_member_sessions.ip. Matches client IP address exactly or partially for session tracking.
     */
    ip?: string | undefined;

    /**
     * Navigation reference URI associated with the session.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct filter on reddit_member_sessions.href. Matches navigation reference URI for session context analysis.
     */
    href?: string | undefined;

    /**
     * Previous page URL that originated the session.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct filter on reddit_member_sessions.referrer. Matches previous page URL for session origin tracking.
     */
    referrer?: string | undefined;

    /**
     * Session creation timestamp (UTC) for filtering by date range.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Date comparison filter on reddit_member_sessions.created_at for temporal session analysis. Uses ISO 8601 format.
     */
    created_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Session expiration timestamp (UTC) for filtering by date range.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Date comparison filter on reddit_member_sessions.expired_at for session duration analysis. Uses ISO 8601 format.
     */
    expired_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Current page number for results pagination (starting at 1).
     *
     * @x-autobe-specification Client-side pagination control for results listing, not derived from database fields. Enforces minimum value 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page (1-100).
     *
     * @x-autobe-specification Max records per page control, enforced with minimum 1 and maximum 100. Not database-related.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
