import { tags } from "typia";

import { IDiscussionBoardAdmin } from "./IDiscussionBoardAdmin";
import { IDiscussionBoardMember } from "./IDiscussionBoardMember";

export namespace IDiscussionBoardActivityReport {
  /**
   * Request parameters for filtering and retrieving activity reports from the discussion board audit log system. This DTO allows administrators to query platform activity with flexible filtering options including date ranges, specific action types, and actor types. All filter parameters are optional to support various reporting scenarios - from broad platform-wide activity summaries to targeted investigations of specific actions or time periods. Pagination parameters are required to ensure controlled data retrieval and prevent excessive response sizes. Security note: This request type is used exclusively by administrator endpoints and requires valid admin authentication.
   */
  export type IRequest = {
    /**
     * Start date of the activity report period (inclusive). Records created on or after this timestamp will be included.
     *
     * @x-autobe-specification Maps to discussion_board_audit_logs.created_at range filter (lower bound). Records created on or after this timestamp will be included in the activity report.
     */
    startDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date of the activity report period (inclusive). Records created on or before this timestamp will be included.
     *
     * @x-autobe-specification Maps to discussion_board_audit_logs.created_at range filter (upper bound). Records created on or before this timestamp will be included in the activity report.
     */
    endDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by specific action types. Valid values: article.create, article.update, article.delete, comment.create, comment.update, comment.delete, section.create, section.update, section.delete, user.ban, user.unban, admin_request.submit, admin_request.approve, admin_request.reject, file.upload, file.delete, image.upload, image.delete. If not provided, all action types are included.
     *
     * @x-autobe-specification Maps to discussion_board_audit_logs.action_type column IN clause. Valid values: article.create, article.update, article.delete, comment.create, comment.update, comment.delete, section.create, section.update, section.delete, user.ban, user.unban, admin_request.submit, admin_request.approve, admin_request.reject, file.upload, file.delete, image.upload, image.delete. If not provided, all action types are included.
     */
    actionTypes?: string[] | undefined;

    /**
     * Filter by actor type. Valid values: 'member' for member actions, 'admin' for administrator actions. If not provided, all actor types are included.
     *
     * @x-autobe-specification Maps to discussion_board_audit_logs.actor_type column IN clause. Valid values: 'member' for member actions, 'admin' for administrator actions. If not provided, all actor types are included.
     */
    actorTypes?: ("member" | "admin")[] | undefined;

    /**
     * Page number for pagination (1-indexed). Required to specify which page of results to retrieve.
     *
     * @x-autobe-specification Pagination offset calculation: offset = (page - 1) * pageSize. Required parameter for offset-based pagination. 1-indexed page number.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of records per page. Maximum allowed is 100 to prevent excessive data retrieval.
     *
     * @x-autobe-specification Number of records per page. Used in offset calculation: offset = (page - 1) * pageSize. Maximum allowed is 100 to prevent excessive data retrieval.
     */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Cursor token for cursor-based pagination. Use this instead of page/pageSize for efficient pagination through large result sets.
     *
     * @x-autobe-specification Cursor token for cursor-based pagination alternative to page/pageSize. If provided, used instead of offset calculation for efficient pagination through large result sets.
     */
    cursor?: string | undefined;

    /**
     * Maximum number of records to return per page. Controls how many records are included in each page response. If omitted, null, or undefined, defaults to 100 records per page. The server may enforce upper bounds to prevent excessive resource consumption on large requests.
     *
     * @x-autobe-specification Maximum records per page. Defaults to 100 if not provided, null, or undefined. Server may enforce upper bounds to prevent excessive resource consumption on large requests.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Activity report summary containing aggregated metrics from the discussion board audit log system.
   *
   * This DTO provides administrators with a condensed view of platform activity over a specified time period. Each summary includes total activity counts, breakdowns by actor type (members vs administrators), and distributions across different action types (article operations, comment operations, section management, user bans, etc.).
   *
   * The summary is computed from the centralized audit log (discussion_board_audit_logs) with joins to member and admin tables for actor context. Activities are grouped by calendar date in UTC timezone, with counts aggregated by action type and actor type for trend analysis.
   *
   * Use this type in paginated activity report responses where administrators need overview metrics before drilling down into individual audit records. The summary includes cursor information for navigation through report pages.
   */
  export type ISummary = {
    /**
     * Unique identifier for this activity report summary.
     *
     * @x-autobe-specification UUID generated for this report summary record. Not stored in database, generated at report creation time for pagination and tracking purposes.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Start of the activity reporting period (inclusive).
     *
     * @x-autobe-specification Reporting period start date provided as query parameter. Used to filter audit_logs.created_at >= start_date in aggregation query.
     */
    start_date: string & tags.Format<"date-time">;

    /**
     * End of the activity reporting period (inclusive).
     *
     * @x-autobe-specification Reporting period end date provided as query parameter. Used to filter audit_logs.created_at <= end_date in aggregation query.
     */
    end_date: string & tags.Format<"date-time">;

    /**
     * Total number of activities recorded in this period.
     *
     * @x-autobe-specification COUNT(*) of all audit records where created_at between start_date and end_date. Computed via SQL aggregation: SELECT COUNT(*) FROM discussion_board_audit_logs WHERE created_at >= ? AND created_at <= ?
     */
    total_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of activities performed by members.
     *
     * @x-autobe-specification COUNT(*) of audit records where actor_type = 'member' AND created_at between start_date and end_date. Computed via SQL aggregation with WHERE clause filtering by actor_type.
     */
    member_activity_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of activities performed by administrators.
     *
     * @x-autobe-specification COUNT(*) of audit records where actor_type = 'admin' AND created_at between start_date and end_date. Computed via SQL aggregation with WHERE clause filtering by actor_type.
     */
    admin_activity_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Activity counts grouped by action type.
     *
     * @x-autobe-specification Object mapping action_type values to their counts. Computed via SQL GROUP BY action_type: SELECT action_type, COUNT(*) FROM discussion_board_audit_logs WHERE created_at BETWEEN ? AND ? GROUP BY action_type. Keys include: 'article.create', 'article.update', 'article.delete', 'comment.create', 'comment.update', 'comment.delete', 'section.create', 'section.update', 'section.delete', 'user.ban', 'user.unban', 'admin.request', etc.
     */
    action_type_breakdown: {
      [key: string]: number & tags.Type<"int32">;
    };

    /**
     * Most active actors during this period.
     *
     * @x-autobe-specification Array of most active actors ranked by activity count within the period. Computed via SQL: SELECT actor_id, actor_type, COUNT(*) as activity_count FROM discussion_board_audit_logs WHERE created_at BETWEEN ? AND ? GROUP BY actor_id, actor_type ORDER BY activity_count DESC LIMIT N. Results joined to discussion_board_members or discussion_board_admins based on actor_type to return ISummary objects.
     */
    top_actors?:
      | (IDiscussionBoardMember.ISummary | IDiscussionBoardAdmin.ISummary)[]
      | undefined;

    /**
     * Cursor token for pagination to next page.
     *
     * @x-autobe-specification Base64-encoded pagination token generated from report metadata (report ID, period dates). Used for cursor-based pagination in paginated report list responses. Not stored in database, generated at response time.
     */
    cursor?: string | undefined;

    /**
     * Timestamp when this report summary was generated.
     *
     * @x-autobe-specification UTC timestamp when this report summary was generated. Set to current time (NOW() in UTC) at report creation time. Not stored in database, computed at response generation.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
