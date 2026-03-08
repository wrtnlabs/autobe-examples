import { tags } from "typia";

export namespace IDiscussionBoardGuestSession {
  /**
   * Summary representation of guest session data for analytics and monitoring.
   */
  export type ISummary = {
    /**
     * Unique guest session identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_guest_sessions.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Current page URL the guest was accessing when the session started.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from discussion_board_guest_sessions.href.
     */
    href: string & tags.Format<"uri">;

    /**
     * Timestamp when the guest session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_guest_sessions.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the guest session expires and becomes invalid.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from discussion_board_guest_sessions.expired_at.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Query parameters for filtering session analytics data.
   */
  export type IRequest = {
    /**
     * Start date for filtering sessions
     *
     * @x-autobe-specification Optional start date for filtering sessions. Sessions created on or after this date-time will be included in the results.
     */
    startDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering sessions
     *
     * @x-autobe-specification Optional end date for filtering sessions. Sessions created before this date-time will be included in the results.
     */
    endDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * User role to filter sessions
     *
     * @x-autobe-specification Optional user role to filter sessions. Can be guest, member, admin, or superAdmin. When provided, only sessions from users with the specified role will be included.
     */
    role?: "guest" | "member" | "admin" | "superAdmin" | undefined;

    /**
     * Minimum session duration in seconds
     *
     * @x-autobe-specification Optional minimum session duration in seconds. Sessions with duration greater than or equal to this value will be included in the results.
     */
    minDuration?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum session duration in seconds
     *
     * @x-autobe-specification Optional maximum session duration in seconds. Sessions with duration less than or equal to this value will be included in the results.
     */
    maxDuration?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Page number for pagination
     *
     * @x-autobe-specification Page number for pagination. Defaults to 1 if not provided. Page numbering starts from 1.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of results per page
     *
     * @x-autobe-specification Number of results per page. Must be between 1 and 100. Defaults to 20 if not provided.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;
  };
}
