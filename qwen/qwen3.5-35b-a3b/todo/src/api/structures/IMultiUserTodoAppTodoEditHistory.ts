import { tags } from "typia";

export namespace IMultiUserTodoAppTodoEditHistory {
  /**
   * Lightweight edit history entry for listing. Shows what changed during an edit with old/new values for each modified field.
   */
  export type ISummary = {
    /**
     * Unique edit history entry identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from multi_user_todo_app_todo_edit_histories.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the edit occurred.
     *
     * @x-autobe-database-schema-property edited_at
     * @x-autobe-specification Direct mapping from multi_user_todo_app_todo_edit_histories.edited_at.
     */
    editedAt: string & tags.Format<"date-time">;

    /**
     * Title value before the edit.
     *
     * @x-autobe-database-schema-property old_title
     * @x-autobe-specification Direct mapping from multi_user_todo_app_todo_edit_histories.old_title. Null if title was added in this edit.
     */
    oldTitle: string | null;

    /**
     * Title value after the edit.
     *
     * @x-autobe-database-schema-property new_title
     * @x-autobe-specification Direct mapping from multi_user_todo_app_todo_edit_histories.new_title. Null if title was removed in this edit.
     */
    newTitle: string | null;

    /**
     * Description value before the edit.
     *
     * @x-autobe-database-schema-property old_description
     * @x-autobe-specification Direct mapping from multi_user_todo_app_todo_edit_histories.old_description. Null if description was added in this edit.
     */
    oldDescription: string | null;

    /**
     * Description value after the edit.
     *
     * @x-autobe-database-schema-property new_description
     * @x-autobe-specification Direct mapping from multi_user_todo_app_todo_edit_histories.new_description. Null if description was removed in this edit.
     */
    newDescription: string | null;

    /**
     * Start date value before the edit.
     *
     * @x-autobe-database-schema-property old_start_date
     * @x-autobe-specification Direct mapping from multi_user_todo_app_todo_edit_histories.old_start_date. Null if start_date was added or was null before this edit.
     */
    oldStartDate: (string & tags.Format<"date-time">) | null;

    /**
     * Start date value after the edit.
     *
     * @x-autobe-database-schema-property new_start_date
     * @x-autobe-specification Direct mapping from multi_user_todo_app_todo_edit_histories.new_start_date. Null if start_date was removed or set to null in this edit.
     */
    newStartDate: (string & tags.Format<"date-time">) | null;

    /**
     * Due date value before the edit.
     *
     * @x-autobe-database-schema-property old_due_date
     * @x-autobe-specification Direct mapping from multi_user_todo_app_todo_edit_histories.old_due_date. Null if due_date was added or was null before this edit.
     */
    oldDueDate: (string & tags.Format<"date-time">) | null;

    /**
     * Due date value after the edit.
     *
     * @x-autobe-database-schema-property new_due_date
     * @x-autobe-specification Direct mapping from multi_user_todo_app_todo_edit_histories.new_due_date. Null if due_date was removed or set to null in this edit.
     */
    newDueDate: (string & tags.Format<"date-time">) | null;
  };
}
