import { tags } from "typia";

export namespace IMultiUserTodoTodoEditHistory {
  /**
   * Lightweight edit history entry for displaying in audit trail lists. This summary type provides essential information about a single field modification made to a todo item. Each entry captures what field was changed, when the change occurred, and the before/after values (when applicable). The old_value may be null when a new field is being set for the first time or when the previous value was empty. The new_value is always present as it represents the value after the edit. Used in paginated responses for edit history viewing, this summary excludes the foreign key reference to the parent todo (implied by the API endpoint context) and the record creation timestamp (redundant with edit_timestamp).
   */
  export type ISummary = {
    /**
     * Unique identifier for this edit history entry.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from multi_user_todo_todo_edit_histories.id. Primary key UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this edit occurred.
     *
     * @x-autobe-database-schema-property edit_timestamp
     * @x-autobe-specification Direct mapping from multi_user_todo_todo_edit_histories.edit_timestamp. DateTime with timezone.
     */
    edit_timestamp: string & tags.Format<"date-time">;

    /**
     * Name of the field that was changed.
     *
     * @x-autobe-database-schema-property field_name
     * @x-autobe-specification Direct mapping from multi_user_todo_todo_edit_histories.field_name. Contains the database column name that was modified (e.g., 'title', 'description', 'start_date', 'due_date', 'completed').
     */
    field_name: string;

    /**
     * Previous value of the field before the edit. Null if the field was being set for the first time or was previously empty.
     *
     * @x-autobe-database-schema-property old_value
     * @x-autobe-specification Direct mapping from multi_user_todo_todo_edit_histories.old_value. Nullable string. Can be null when a new field is being set for the first time or when the previous value was empty.
     */
    old_value: string | null;

    /**
     * New value of the field after the edit.
     *
     * @x-autobe-database-schema-property new_value
     * @x-autobe-specification Direct mapping from multi_user_todo_todo_edit_histories.new_value. Required string. Contains the value after the edit.
     */
    new_value: string;
  };
}
