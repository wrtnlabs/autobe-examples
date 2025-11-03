import { tags } from "typia";

import { ICommunityBbsCommunityMember } from "./ICommunityBbsCommunityMember";

export namespace ICommunityBbsCommunityMemberSession {
  /**
   * Search and pagination request for community member sessions. This DTO is
   * used to filter and page community_bbs_communitymember_sessions records
   * for a specific member. It is a request-type schema (query/body) and does
   * NOT map directly to a Prisma model. All properties are optional; use them
   * to constrain the session listing query. Note: 'cursor' and 'page' are
   * mutually exclusive; when both present servers SHOULD prefer 'cursor'.
   * Timestamps MUST be ISO 8601 (UTC).
   */
  export type IRequest = {
    /**
     * Filter sessions by exact IP address. Matches the session 'ip' column
     * (community_bbs_communitymember_sessions.ip). Accepts RFC-compliant
     * IPv4 or IPv6 string (server may normalize). Example: '198.51.100.23'
     * or '2001:db8::1'.
     */
    ip?: string | undefined;

    /**
     * When true, return only active sessions. Active sessions are those
     * where 'expired_at' is null or expires in the future.
     */
    activeOnly?: boolean | undefined;

    /**
     * Inclusive lower bound filter for session creation time (ISO 8601
     * UTC). Return sessions with created_at >= this value.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Exclusive upper bound filter for session creation time (ISO 8601
     * UTC). Return sessions with created_at < this value.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Maximum number of sessions to return in the page. Server-enforced
     * maximum 200; recommended client default 25.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<25> &
          tags.Minimum<1> &
          tags.Maximum<200>)
      | undefined;

    /**
     * Opaque cursor for cursor-based pagination. When provided, 'limit'
     * constrains records after the cursor. MUTUALLY EXCLUSIVE with 'page' —
     * server SHOULD prefer 'cursor' when both are supplied.
     */
    cursor?: string | undefined;

    /**
     * 1-based page index for offset-style pagination. Optional fallback for
     * clients that do not support cursor-based pagination. When 'cursor' is
     * provided server SHOULD ignore 'page'.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;
  };

  /**
   * Summary view of a community member session. Lightweight representation
   * intended for session lists and user session management. Contains only
   * non-sensitive session metadata. Maps to Prisma model
   * community_bbs_communitymember_sessions. Note: `member` is a transformed
   * FK (community_bbs_communitymember_id ->
   * ICommunityBbsCommunityMember.ISummary). `created_at` and `ip` are
   * required by the DB; `expired_at` is nullable.
   */
  export type ISummary = {
    /** Session identifier (community_bbs_communitymember_sessions.id). */
    id: string & tags.Format<"uuid">;

    /**
     * Summary of the community member owning this session (transforms
     * community_bbs_communitymember_sessions.community_bbs_communitymember_id).
     * Does not expose sensitive member fields.
     */
    member: ICommunityBbsCommunityMember.ISummary;

    /**
     * IP address that initiated the session
     * (community_bbs_communitymember_sessions.ip).
     */
    ip: string;

    /**
     * Connection URL or landing href recorded for the session
     * (community_bbs_communitymember_sessions.href). Nullable when not
     * available.
     */
    href?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Referrer URL for the session
     * (community_bbs_communitymember_sessions.referrer). Nullable when not
     * available.
     */
    referrer?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Session creation timestamp
     * (community_bbs_communitymember_sessions.created_at).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Optional session expiration timestamp
     * (community_bbs_communitymember_sessions.expired_at). Nullable for
     * open-ended sessions.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
