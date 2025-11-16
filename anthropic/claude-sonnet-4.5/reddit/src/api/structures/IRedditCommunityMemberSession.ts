import { tags } from "typia";

export namespace IRedditCommunityMemberSession {
  /**
   * Query parameters for filtering, sorting, and paginating member session
   * retrieval requests.
   *
   * This DTO contains optional filtering and pagination controls for browsing
   * a member's authentication session history. All parameters are optional,
   * with sensible defaults applied server-side. The page and limit parameters
   * enable efficient pagination through potentially large session lists. The
   * sort_by and order parameters allow customization of result ordering. The
   * include_expired flag controls whether expired sessions are included for
   * audit purposes.
   *
   * Typically used in GET requests to retrieve session lists with specific
   * filtering and sorting requirements. The flexibility of optional
   * parameters allows clients to request simple unfiltered lists or apply
   * sophisticated filtering for specific use cases.
   */
  export type IRequest = {
    /**
     * Page number for pagination. Determines which page of session records
     * to retrieve from the complete result set.
     *
     * Must be a positive integer starting from 1 for the first page. Used
     * in conjunction with limit to implement offset-based pagination.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of session records to return per page. Controls the
     * page size for pagination.
     *
     * Must be between 1 and 100 inclusive. Smaller values improve response
     * time but require more requests for complete data. Typical values are
     * 10, 20, or 50 depending on UI requirements.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Search query string for filtering sessions. Enables text-based
     * filtering across searchable session fields.
     *
     * Can be used to search by IP address, user agent substring, or other
     * session metadata. Helps users quickly locate specific sessions in
     * large session lists.
     */
    search?: string | undefined;

    /**
     * Field name to sort session results by. Determines the ordering of
     * returned session records.
     *
     * Supported sort fields include created_at for chronological ordering
     * and expired_at for expiration-based ordering. Default sorting is
     * typically by created_at in descending order (newest first).
     */
    sort_by?: "created_at" | "expired_at" | undefined;

    /**
     * Sort order direction for session results. Controls whether sorting is
     * ascending or descending.
     *
     * Use 'asc' for ascending order (oldest or earliest first) or 'desc'
     * for descending order (newest or latest first). Default is typically
     * 'desc' to show most recent sessions first.
     */
    order?: "asc" | "desc" | undefined;

    /**
     * Flag to include expired sessions in the results. Controls whether
     * expired session records are returned.
     *
     * When false or omitted, only active sessions (expired_at is null) are
     * returned. When true, both active and expired sessions are included
     * for audit trail purposes.
     */
    include_expired?: boolean | undefined;
  };

  /**
   * Summary representation of a member authentication session.
   *
   * Provides essential session information for tracking authenticated member
   * activity without exposing sensitive authentication tokens. Used in list
   * views and embedded references where full session details are not
   * required.
   *
   * This summary includes the session identifier, associated member
   * reference, connection context (IP, URLs), creation timestamp, and
   * expiration status. It enables session monitoring and audit trail
   * visualization while maintaining security boundaries.
   *
   * Typically used in administrative interfaces, security dashboards, and
   * member activity logs where session context is needed for analysis and
   * reporting.
   */
  export type ISummary = {
    /**
     * Unique identifier for the member session record.
     *
     * This UUID serves as the primary key for tracking individual
     * authentication sessions in the system.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Foreign key reference to the authenticated member.
     *
     * Links this session to the specific registered user who created it
     * through login.
     */
    reddit_community_member_id: string & tags.Format<"uuid">;

    /**
     * IP address from which the session was initiated.
     *
     * Captures the client's network address for security monitoring and
     * audit purposes. May be IPv4 or IPv6 format.
     */
    ip: string;

    /**
     * Connection URL where the session was established.
     *
     * Represents the current page URL when the user logged in or created
     * the session.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL from which the user navigated before session creation.
     *
     * Captures the previous page URL for tracking user flow and session
     * context.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Timestamp when the session was created.
     *
     * Records the exact moment when the member successfully authenticated
     * and established this session.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session ended or was terminated.
     *
     * Records when the session was invalidated through logout, token
     * expiration, or security events. A null value indicates the session is
     * currently active and has not been terminated.
     *
     * This field is essential for session lifecycle tracking, security
     * auditing, and identifying active versus expired sessions in
     * administrative interfaces.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
