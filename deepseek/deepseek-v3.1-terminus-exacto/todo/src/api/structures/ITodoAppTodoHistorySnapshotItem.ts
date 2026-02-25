import { tags } from "typia";

import { ITodoAppTodoHistorySnapshot } from "./ITodoAppTodoHistorySnapshot";

export namespace ITodoAppTodoHistorySnapshotItem {
  /**
   * Request body for searching and filtering historical snapshots of a specific todo. Provides pagination controls and optional filtering by date ranges and content search.
   */
  export type IRequest = {
    /**
     * Page number for paginated results (1-indexed).
     *
     * @x-autobe-specification Pagination parameter for result navigation. Maps to OFFSET calculation: (page - 1) * limit. Used for cursor-based pagination to navigate through large sets of historical snapshot data.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page (1-100).
     *
     * @x-autobe-specification Maximum number of records to return per page. Used in LIMIT clause for database queries. Validated to be between 1 and 100 inclusive to prevent excessive data retrieval.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Optional text search query for filtering snapshots by title or description content.
     *
     * @x-autobe-specification Optional text search parameter. Performs case-insensitive pattern matching on todo_app_todo_history_snapshot_items.title and todo_app_todo_history_snapshot_items.description fields using ILIKE operator with wildcards.
     */
    search?: string | undefined;

    /**
     * Optional start date for filtering snapshots (inclusive).
     *
     * @x-autobe-specification Optional start date for filtering snapshots. Applied to todo_app_todo_history_snapshots.snapshot_created_at field. When provided, filters snapshots created on or after this timestamp. Null value disables the filter.
     */
    from_date?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional end date for filtering snapshots (inclusive).
     *
     * @x-autobe-specification Optional end date for filtering snapshots. Applied to todo_app_todo_history_snapshots.snapshot_created_at field. When provided, filters snapshots created on or before this timestamp. Null value disables the filter.
     */
    to_date?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Summary view of a todo history snapshot item, providing essential information for list display showing the evolution of a todo over time. Contains snapshot metadata and todo state at specific edit moments for audit trail viewing.
   */
  export type ISummary = {
    /**
     * Unique identifier for the history snapshot item
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshot_items.id. UUID primary key identifying the specific snapshot item.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Title of the todo at the time this snapshot was captured
     *
     * @x-autobe-database-schema-property title
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshot_items.title. Captures the todo title at the time of snapshot creation.
     */
    title: string;

    /**
     * Start date of the todo at the time this snapshot was captured, or null if not set
     *
     * @x-autobe-database-schema-property start_date
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshot_items.start_date. Nullable timestamp capturing the start date value at snapshot time.
     */
    start_date: (string & tags.Format<"date-time">) | null;

    /**
     * Due date of the todo at the time this snapshot was captured, or null if not set
     *
     * @x-autobe-database-schema-property due_date
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshot_items.due_date. Nullable timestamp capturing the due date value at snapshot time.
     */
    due_date: (string & tags.Format<"date-time">) | null;

    /**
     * Whether the todo was completed at the time this snapshot was captured
     *
     * @x-autobe-database-schema-property is_completed
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshot_items.is_completed. Boolean flag indicating completion status at snapshot time.
     */
    is_completed: boolean;

    /**
     * Parent snapshot metadata containing timestamp information for when this snapshot item was created
     *
     * @x-autobe-database-schema-property snapshot
     * @x-autobe-specification Relation mapping via todo_app_todo_history_snapshot_id foreign key to todo_app_todo_history_snapshots table. JOIN operation retrieves snapshot metadata including creation timestamps.
     */
    snapshot: ITodoAppTodoHistorySnapshot.ISummary;
  };
}
