import { tags } from "typia";

export namespace IDiscussionBoardModerationQueue {
  /**
   * Search and filtering parameters for the moderation queue with pagination
   * and sorting options.
   *
   * Enables moderators to efficiently navigate and manage the article review
   * queue with flexible filtering capabilities. Supports filtering by
   * priority level, submission date range, assigned moderator, and
   * contributor author. Results can be sorted by submission timestamp for
   * standard FIFO workflow or by priority for urgent item management.
   *
   * All filter parameters are optional. When no filters are specified,
   * returns all pending queue items in default order.
   */
  export type IRequest = {
    /**
     * Page number for pagination. Starts at 1. Used to navigate through
     * paginated results.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of queue items per page. Maximum 100 items. Defaults to 20 if
     * not specified.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter by priority level: 'normal' (default), 'high' (expedited
     * review), 'low' (secondary priority). Optional. If specified, only
     * queue items with this priority are returned.
     */
    priority?: "normal" | "high" | "low" | null | undefined;

    /**
     * Filter by assigned moderator UUID. Optional. If specified, returns
     * only queue items assigned to this moderator. If null, returns
     * unassigned items.
     */
    assigned_moderator_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Filter by contributor UUID. Optional. If specified, returns only
     * queue items submitted by this contributor.
     */
    contributor_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Start of submission date range (ISO 8601 format). Optional. Returns
     * queue items submitted on or after this date.
     */
    submitted_date_from?:
      | (string & tags.Format<"date-time">)
      | null
      | undefined;

    /**
     * End of submission date range (ISO 8601 format). Optional. Returns
     * queue items submitted on or before this date.
     */
    submitted_date_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Sort order for results: 'submitted_at' (oldest first, standard FIFO
     * workflow), 'priority' (high priority first). Defaults to
     * 'submitted_at' if not specified.
     */
    sort_by?: "submitted_at" | "priority" | undefined;

    /**
     * Sort direction: 'asc' (ascending), 'desc' (descending). Defaults to
     * 'asc' for submitted_at (oldest first) and 'desc' for priority
     * (highest first).
     */
    sort_order?: "asc" | "desc" | undefined;
  };

  /**
   * Lightweight summary representation of moderation queue entries for list
   * views and moderator dashboards.
   *
   * Represents individual items in the article moderation queue, tracking
   * articles submitted by contributors awaiting moderator approval,
   * rejection, or revision requests. Each queue entry captures submission
   * context, assignment status, and review progress.
   *
   * The queue is the central workflow mechanism for the moderation system.
   * When contributors submit articles, queue entries are created
   * automatically to initiate the review process. Moderators retrieve queue
   * items through this summary view to prioritize their workload, filter by
   * urgency or contributor, and track which articles are unreviewed,
   * in-progress, or ready for decision.
   *
   * The summary variant provides essential information for efficient queue
   * management including article reference, contributor reference, submission
   * timestamp, priority level, moderator assignment, and review status. It
   * excludes detailed audit trail data and full schema to optimize
   * performance in list views where many queue entries may be displayed
   * simultaneously.
   *
   * Workflow Context: Queue items are created when articles reach
   * pending_approval status. They persist until moderators approve or reject
   * the article, at which point they remain in the queue table for audit
   * purposes but are no longer actively retrieved by moderator workflows.
   */
  export type ISummary = {
    /**
     * Unique identifier for the moderation queue entry. Generated as UUID
     * v4 upon creation and persists for the lifetime of the queue record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reference to the article awaiting review. Links this queue entry to
     * the specific article in the discussion_board_articles table that
     * requires moderator approval.
     */
    discussion_board_article_id: string & tags.Format<"uuid">;

    /**
     * Reference to the contributor who submitted the article. Links this
     * queue entry to the submitting contributor in the
     * discussion_board_contributors table, enabling moderators to assess
     * contributor history and context when reviewing articles.
     */
    discussion_board_contributor_id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the article was submitted for review in ISO 8601
     * format. Used as the primary sort field for queue ordering in standard
     * FIFO (first-in-first-out) workflow mode, ensuring older submissions
     * are reviewed first by default.
     */
    submitted_at: string & tags.Format<"date-time">;

    /**
     * Priority level for moderator review workflow prioritization. Controls
     * review urgency and queue sorting. Values: 'normal' (default priority
     * for standard articles), 'high' (flagged for expedited review due to
     * urgency or special circumstances), 'low' (secondary priority for
     * routine content).
     */
    priority: "normal" | "high" | "low";

    /**
     * Reference to moderator assigned for review, if any. Contains UUID of
     * the assigned moderator from discussion_board_moderators table. Null
     * value indicates the queue item is unassigned and awaiting moderator
     * pickup. Assignment enables workload distribution and progress
     * tracking across the moderation team.
     */
    assigned_moderator_id: (string & tags.Format<"uuid">) | null;

    /**
     * Timestamp when a moderator began reviewing the article in ISO 8601
     * format. Null indicates the queue item has not yet entered active
     * review. This field tracks review lifecycle progression and enables
     * identification of items in-progress versus unreviewed.
     */
    review_started_at: (string & tags.Format<"date-time">) | null;

    /**
     * Optional notes from contributor explaining the article or addressing
     * previous feedback. Maximum 1000 characters. Null if no notes
     * provided. Helps moderators understand context and intent behind
     * submitted content, particularly useful for articles addressing prior
     * review comments.
     */
    submission_notes: (string & tags.MaxLength<1000>) | null;

    /**
     * Timestamp when the queue entry was created in ISO 8601 format.
     * Represents when the article was added to the moderation queue. Used
     * for audit trail purposes and administrative tracking of queue entry
     * lifecycle.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent update to this queue entry in ISO 8601
     * format. Tracks when any field of this queue record was modified,
     * including assignment changes or review status updates. Essential for
     * audit compliance and understanding recent activity on queue items.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
