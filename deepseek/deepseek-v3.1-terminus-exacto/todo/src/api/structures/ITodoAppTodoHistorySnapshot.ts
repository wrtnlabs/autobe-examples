import { tags } from "typia";

import { ITodoAppTodo } from "./ITodoAppTodo";

export namespace ITodoAppTodoHistorySnapshot {
  /**
   * Summary representation of a todo history snapshot, providing essential timestamp information for display in paginated lists. Each snapshot represents a point-in-time capture of todo state changes as part of the audit trail system.
   */
  export type ISummary = {
    /**
     * Unique identifier for the history snapshot
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshots.id. Primary key identifier for the snapshot record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the snapshot was captured
     *
     * @x-autobe-database-schema-property snapshot_created_at
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshots.snapshot_created_at. Represents the actual timestamp when the snapshot was captured.
     */
    snapshot_created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the snapshot record was created
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshots.created_at. Represents when the snapshot record was created in the database.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Search criteria and pagination parameters for querying todo history snapshots. Supports filtering by snapshot creation timestamp range and standard pagination controls for efficient list navigation.
   */
  export type IRequest = {
    /**
     * Page number for paginated results (1-indexed).
     *
     * @x-autobe-specification Controls pagination offset. Maps to SQL OFFSET calculation: OFFSET = (page - 1) * limit. Defaults to 1 if not provided.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page (1-100).
     *
     * @x-autobe-specification Controls pagination page size. Maps to SQL LIMIT clause. Enforced maximum of 100 records per page for performance. Defaults to system default if not provided.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Start timestamp for filtering snapshot creation range (inclusive).
     *
     * @x-autobe-specification Filters snapshots by snapshot_created_at >= search_start. Applied after validating user ownership of the todo and history entry. Null value means no lower bound filter.
     */
    search_start?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * End timestamp for filtering snapshot creation range (inclusive).
     *
     * @x-autobe-specification Filters snapshots by snapshot_created_at <= search_end. Applied after validating user ownership of the todo and history entry. Null value means no upper bound filter.
     */
    search_end?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Complete historical snapshot of a todo's state captured at a specific point in time. Contains all preserved field values including title, description, start date, due date, completion status, and timestamps as they existed when the snapshot was created. This immutable record supports audit trail functionality and historical reference capabilities for compliance and user transparency.
   */
  export type Item = {
    /**
     * Unique identifier for this historical snapshot record
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshot_items.id. Unique UUID identifier for this specific historical snapshot entry.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The todo's title as recorded in this historical snapshot
     *
     * @x-autobe-database-schema-property title
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshot_items.title. Preserves the exact title text as it existed at the time of snapshot creation.
     */
    title: string;

    /**
     * The todo's description text as recorded in this historical snapshot
     *
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshot_items.description. Preserves the exact description text (including null) as it existed at snapshot time.
     * @x-autobe-database-schema-property description
     */
    description: string | null;

    /**
     * The todo's start date as recorded in this historical snapshot
     *
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshot_items.start_date. Preserves the exact start date (including null) as it existed at snapshot time.
     * @x-autobe-database-schema-property start_date
     */
    start_date: (string & tags.Format<"date-time">) | null;

    /**
     * The todo's due date as recorded in this historical snapshot
     *
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshot_items.due_date. Preserves the exact due date (including null) as it existed at snapshot time.
     * @x-autobe-database-schema-property due_date
     */
    due_date: (string & tags.Format<"date-time">) | null;

    /**
     * Timestamp when the todo was completed, or null if incomplete at snapshot time
     *
     * @x-autobe-specification Transformation mapping: todo_app_todo_history_snapshot_items.is_completed (boolean) → completed_at (timestamp/null). When is_completed=true, represents timestamp of completion; when false, null indicates incomplete status.
     * @x-autobe-database-schema-property is_completed
     */
    completed_at: (string & tags.Format<"date-time">) | null;

    /**
     * Timestamp when this historical snapshot was created and preserved
     *
     * @x-autobe-specification Derived from todo_app_todo_history_snapshots.snapshot_created_at via JOIN on todo_app_todo_history_snapshot_id. Represents the exact moment when this historical state was captured.
     */
    snapshot_created_at: string & tags.Format<"date-time">;

    /**
     * The parent snapshot that contains this historical state record.
     *
     * @x-autobe-specification JOIN via todo_app_todo_history_snapshots using todo_app_todo_history_snapshot_id. Returns snapshot metadata for audit context.
     * @x-autobe-database-schema-property snapshot
     */
    snapshot: ITodoAppTodoHistorySnapshot.ISummary;

    /**
     * The todo that this historical snapshot represents.
     *
     * @x-autobe-specification JOIN via todo_app_todos using todo_app_todo_id. Returns todo reference for complete audit trail context.
     * @x-autobe-database-schema-property todo
     */
    todo: ITodoAppTodo.ISummary;
  };
}
