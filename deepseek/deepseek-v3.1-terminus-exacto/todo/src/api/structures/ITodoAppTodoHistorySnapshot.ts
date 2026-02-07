import { tags } from "typia";

export namespace ITodoAppTodoHistorySnapshot {
  /**
   * Summary view of historical snapshot metadata showing when snapshot generation events occurred for audit trail purposes. Provides essential timing information for snapshot lifecycle management without exposing internal foreign key relationships.
   */
  export type ISummary = {
    /**
     * Unique identifier for the snapshot metadata record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshots.id. UUID primary key used for unique identification of snapshot metadata records.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the snapshot generation event occurred, representing when the historical state was captured.
     *
     * @x-autobe-database-schema-property snapshot_created_at
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshots.snapshot_created_at. Represents the exact timestamp when the historical state snapshot was generated for audit trail purposes.
     */
    snapshot_created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this snapshot metadata record was created in the database.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from todo_app_todo_history_snapshots.created_at. Records when this snapshot metadata entry was created in the database system.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
