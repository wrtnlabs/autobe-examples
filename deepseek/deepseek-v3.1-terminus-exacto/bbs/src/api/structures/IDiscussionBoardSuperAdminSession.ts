import { tags } from "typia";

export namespace IDiscussionBoardSuperAdminSession {
  /**
   * Summary view of super administrator session records for administrative oversight and list displays.
   */
  export type ISummary = {
    /**
     * Unique identifier for the super administrator session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_super_admin_sessions.id. Primary key of the session record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * IP address from which the super administrator logged in, used for security audit purposes.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from discussion_board_super_admin_sessions.ip. IPv4 format for security audit and geographic tracking.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * Timestamp when this super administrator session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_super_admin_sessions.created_at. Timestamp when session was established.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this super administrator session is scheduled to expire, requiring refresh or re-authentication.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from discussion_board_super_admin_sessions.expired_at. Timestamp when session tokens become invalid.
     */
    expired_at: string & tags.Format<"date-time">;
  };
}
