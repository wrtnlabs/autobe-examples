import { tags } from "typia";

export namespace IRedditLikeMemberPasswordReset {
  /**
   * Query parameters for retrieving paginated password reset request history. Supports filtering by creation date range and token status.
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-indexed).
     *
         * @x-autobe-specification Pagination parameter specifying which page of
         *   results to retrieve. 1-indexed. Used to calculate OFFSET for SQL
         *   query: OFFSET = (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
         * @x-autobe-specification Pagination parameter specifying maximum
         *   records per page. Used for SQL LIMIT clause. Range 1-100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Start of creation date range filter (inclusive).
     *
         * @x-autobe-specification Filter parameter for date range start on
         *   created_at column. When provided, adds WHERE clause: created_at >=
         *   createdAtFrom. Supports filtering reset requests from a specific
         *   date.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * End of creation date range filter (inclusive).
     *
         * @x-autobe-specification Filter parameter for date range end on
         *   created_at column. When provided, adds WHERE clause: created_at <=
         *   createdAtTo. Supports filtering reset requests up to a specific
         *   date.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter by token status: PENDING (awaiting use), USED (consumed), or EXPIRED (past expiration).
     *
         * @x-autobe-specification Computed status filter mapping to database
         *   conditions: PENDING = used_at IS NULL AND expires_at > NOW(), USED
         *   = used_at IS NOT NULL, EXPIRED = used_at IS NULL AND expires_at <=
         *   NOW(). Translates to appropriate WHERE clause conditions.
     */
    status?: "PENDING" | "USED" | "EXPIRED" | null | undefined;
  };

  /**
   * Summary view of a member's password reset request for security auditing. Shows request metadata, audit information (IP, user agent), timing information, and token status without exposing the sensitive token value itself.
   */
  export type ISummary = {
    /**
     * Unique identifier for the password reset request.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   reddit_like_member_password_resets.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Current status of the password reset token - pending (awaiting use), used (already consumed), or expired (past expiration) without being used.
     *
         * @x-autobe-specification Computed field based on used_at and
         *   expires_at. Returns 'pending' if used_at is null and expires_at is
         *   in the future, 'used' if used_at is not null, 'expired' if
         *   expires_at has passed and used_at is still null.
     */
    status: "pending" | "used" | "expired";

    /**
     * Timestamp when the password reset request was created.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_member_password_resets.created_at. Timestamp when the
         *   reset token was created.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the reset token becomes invalid.
     *
         * @x-autobe-database-schema-property expires_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_member_password_resets.expires_at. Members must
         *   complete password reset before this time.
     */
    expiresAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the token was consumed to reset the password, or null if not yet used.
     *
         * @x-autobe-database-schema-property used_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_member_password_resets.used_at. Null until consumed.
         *   Prevents token reuse after successful reset.
     */
    usedAt: (string & tags.Format<"date-time">) | null;

    /**
     * IP address from which the reset token was requested.
     *
         * @x-autobe-database-schema-property ip_address
         * @x-autobe-specification Direct mapping from
         *   reddit_like_member_password_resets.ip_address. Captured at time of
         *   request for security auditing and fraud detection.
     */
    ipAddress: string;

    /**
     * User agent string from the requesting client, or null if not available.
     *
         * @x-autobe-database-schema-property user_agent
         * @x-autobe-specification Direct mapping from
         *   reddit_like_member_password_resets.user_agent. Captured at time of
         *   request for security auditing.
     */
    userAgent: string | null;
  };
}
