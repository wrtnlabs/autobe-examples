import { tags } from "typia";

export namespace ITodoAppTrashEntry {
  /**
   * Summary representation of a deleted todo entry in the trash system.
   *
   * This DTO provides essential information about a deleted todo to help users
   * identify which entries they want to restore or permanently delete.
   * It includes the todo's title, deletion timestamp, and original creation date.
   */
  export type ISummary = {
    /**
     * Timestamp when the todo was moved to the trash (deletion timestamp).
     *
     * This indicates exactly when the user performed the delete action,
     * making it clear when the todo was removed from the active list.
     *
     * @x-autobe-specification Computed field with no direct database column. This timestamp is derived from the system time when the todo was moved to the trash, not from a specific column in the todo_app_trash_entries table.
     */
    deletedAt: string & tags.Format<"date-time">;

    /**
     * Unique identifier for the deleted todo entry in the trash system.
     *
     * This UUID corresponds to the primary key of the trash entry record,
     * which maintains the relationship to the original todo that was deleted.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_trash_entries.id column. UUID primary key that uniquely identifies this trash entry record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The title of the original todo when it was deleted and moved to the trash.
     *
     * This preserved title helps users identify which todo this trash entry
     * represents without needing to restore it first.
     *
     * @x-autobe-database-schema-property originalTodo
     * @x-autobe-specification Mapped to relation originalTodo.title. Retrieved by joining todo_app_trash_entries.todo_app_todo_id to todo_app_todos.id and selecting the title column from the related todo_app_todos record.
     */
    title: string;

    /**
     * Original creation timestamp of the todo before it was deleted.
     *
     * This shows when the todo was first created, providing historical context
     * about how long the item has been in the user's system.
     *
     * @x-autobe-database-schema-property originalTodo
     * @x-autobe-specification Mapped to relation originalTodo.created_at. Retrieved by joining todo_app_trash_entries.todo_app_todo_id to todo_app_todos.id and selecting the created_at column from the related todo_app_todos record.
     */
    createdAt: string & tags.Format<"date-time">;
  };
}
