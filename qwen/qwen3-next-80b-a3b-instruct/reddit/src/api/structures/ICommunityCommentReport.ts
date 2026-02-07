import { tags } from "typia";

export namespace ICommunityCommentReport {
  /**
   * A summary of a comment report for moderation review, showing the report reason, status, creation time, and references to the reporter and reported comment. Designed for efficient display in moderation dashboards where hundreds of reports need to be viewed quickly without loading full entity details.
   */
  export type ISummary = {};

  /**
   * Search and pagination parameters for retrieving comment reports. Use to filter reports by status, reporter, reported comment, date range, and sorting preferences. Required for pagination of moderation queue.
   */
  export type IRequest = {
    /**
     * Status of the comment report: 'pending' for unreviewed reports, 'approved' for reports that have been acted upon, or 'dismissed' for reports that have been rejected.
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Direct mapping from community_comment_reports.status field. Must be one of: 'pending', 'approved', or 'dismissed'. Filters reports based on their current moderation state.
     */
    status: "pending" | "approved" | "dismissed";

    /**
     * The unique identifier of the user who submitted the report. Links to the community_members or community_admins table to identify the reporter of the comment.
     *
     * @x-autobe-database-schema-property reporter_id
     * @x-autobe-specification Direct mapping from community_comment_reports.reporter_id field. References community_members.id for regular users or community_admins.id for administrators. Used to filter reports by who submitted the report.
     */
    reporter_id: string & tags.Format<"uuid">;

    /**
     * The unique identifier of the comment that was reported. Links to the community_comments table to identify the specific comment content that is under review.
     *
     * @x-autobe-database-schema-property reported_comment_id
     * @x-autobe-specification Direct mapping from community_comment_reports.reported_comment_id field. References community_comments.id to identify which specific comment was reported. Used to filter reports by target comment identifier.
     */
    reported_comment_id: string & tags.Format<"uuid">;

    /**
     * The earliest creation date to include in results. Reports must have been created on or after this date and time (ISO 8601 format). Used for time-based filtering of report submissions.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Filter parameter for querying reports created on or after this timestamp. Direct mapping to community_comment_reports.created_at field using greater-than-or-equal comparison. Used to filter reports by their creation date range.
     */
    created_at_start: string & tags.Format<"date-time">;

    /**
     * The latest creation date to include in results. Reports must have been created on or before this date and time (ISO 8601 format). Used for time-based filtering of report submissions.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Filter parameter for querying reports created on or before this timestamp. Direct mapping to community_comment_reports.created_at field using less-than-or-equal comparison. Used to filter reports by their creation date range.
     */
    created_at_end: string & tags.Format<"date-time">;

    /**
     * The field by which to sort the list of reports: 'created_at' for newest first, 'status' for grouping by moderation status, or 'reporter_type' for grouping by reporter role (member/admin).
     *
     * @x-autobe-specification Application-level sort preference that determines which database field to order results by. Maps to: 'created_at' → ORDER BY created_at DESC, 'status' → ORDER BY status, 'reporter_type' → ORDER BY reporter_id (via JOIN with community_members/communities_admins). Does not map to a single database column but controls the ORDER BY clause generation.
     */
    sort_by: "created_at" | "status" | "reporter_type";

    /**
     * The direction to sort results: 'asc' for ascending order or 'desc' for descending order. Applied to the sort_by field to control whether newest/oldest, highest/lowest, etc. appear first.
     *
     * @x-autobe-specification Application-level sort direction parameter. Maps to SQL ORDER BY clause: 'asc' → ASCENDING, 'desc' → DESCENDING. Controls ascending/descending order of the sort_by field results. Does not map to a specific database column but modifies the query's ORDER BY clause behavior.
     */
    order: "asc" | "desc";

    /**
     * The maximum number of report records to return in a single page. Must be at least 1 and no more than 100 to ensure optimal performance and UI usability.
     *
     * @x-autobe-specification Pagination control parameter that specifies the maximum number of records to return per page. Maps to SQL LIMIT clause. Must be between 1 and 100 as defined by business requirement for performance and UI display.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * The number of report records to skip before starting to return results. Used for navigating between pages in pagination. Must be a non-negative integer.
     *
     * @x-autobe-specification Pagination control parameter that specifies the number of records to skip before starting to return results. Maps to SQL OFFSET clause. Must be >= 0. Used to implement cursor-based pagination by skipping previous pages' records.
     */
    offset: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
