import { tags } from "typia";

export namespace IRedditLikeReportSnapshot {
  /**
   * Request body for retrieving paginated report snapshot history with sorting options. Used by moderators to browse the audit trail of report status changes.
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-indexed). Defaults to 1 if not specified.
     *
     * @x-autobe-specification Query parameter for pagination. 1-indexed page number. Default: 1. Used with limit to calculate database OFFSET.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page. Range: 1-100.
     *
     * @x-autobe-specification Query parameter for pagination. Maximum records per page. Range: 1-100. Default: typically 20. Used to calculate database LIMIT.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort direction for ordering snapshots by timestamp. 'asc' for chronological, 'desc' for reverse chronological.
     *
     * @x-autobe-specification Query parameter for sorting. Sorts by created_at column. 'asc' for chronological order (oldest first), 'desc' for reverse chronological (newest first). Default: typically 'desc'.
     */
    sortDirection?: "asc" | "desc" | undefined;
  };

  /**
   * Lightweight summary of a report snapshot capturing the status at a specific point in time, including the moderator who made the status change.
   */
  export type ISummary = {
    /**
     * Unique identifier for the report snapshot.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_like_report_snapshots.id (UUID primary key).
     */
    id: string & tags.Format<"uuid">;

    /**
     * The report status at the moment this snapshot was captured.
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Direct mapping from reddit_like_report_snapshots.status. Represents the report status at the time of snapshot capture: 'pending', 'approved', or 'dismissed'.
     */
    status: string;

    /**
     * When this snapshot was captured, indicating the time of the status change.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_like_report_snapshots.created_at. Timestamp when this snapshot was created, marking when the status transition occurred.
     */
    createdAt: string & tags.Format<"date-time">;
  };
}
