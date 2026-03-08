import { tags } from "typia";

export namespace ITodoAppTodoEdit {
  /**
   * Request parameters for filtering and paginating todo edit history entries.
   */
  export type IRequest = {
    /**
     * Minimum edit timestamp filter (inclusive). Find history entries where the edit occurred on or after this timestamp.
     *
     * @x-autobe-specification Optional timestamp filter to find edit history entries where edited_at >= edited_at_min.
     */
    edited_at_min?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Maximum edit timestamp filter (inclusive). Find history entries where the edit occurred on or before this timestamp.
     *
     * @x-autobe-specification Optional timestamp filter to find edit history entries where edited_at <= edited_at_max.
     */
    edited_at_max?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination.
     *
     * @x-autobe-specification Optional page number for pagination. Defaults to 1 if not provided.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of results per page.
     *
     * @x-autobe-specification Optional limit on number of results per page. Must be between 1 and 100. Defaults to 20 if not provided.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;
  };

  /**
   * Lightweight edit history entry for list displays, showing the timestamp and changed field values.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property edited_at
     */
    edited_at: string & tags.Format<"date-time">;

    /**
     * The title value before this edit. NULL if title was not changed
     *
     * @x-autobe-database-schema-property previous_title
     * @x-autobe-specification Direct mapping from todo_app_todo_edits.previous_title
     */
    previous_title: string | null;

    /**
     * The title value after this edit. NULL if title was not changed
     *
     * @x-autobe-database-schema-property new_title
     * @x-autobe-specification Direct mapping from todo_app_todo_edits.new_title
     */
    new_title: string | null;

    /**
     * The description value before this edit. NULL if description was not changed
     *
     * @x-autobe-database-schema-property previous_description
     * @x-autobe-specification Direct mapping from todo_app_todo_edits.previous_description
     */
    previous_description: string | null;

    /**
     * The description value after this edit. NULL if description was not changed
     *
     * @x-autobe-database-schema-property new_description
     * @x-autobe-specification Direct mapping from todo_app_todo_edits.new_description
     */
    new_description: string | null;

    /**
     * The start date value before this edit. NULL if start date was not changed
     *
     * @x-autobe-database-schema-property previous_start_date
     * @x-autobe-specification Direct mapping from todo_app_todo_edits.previous_start_date
     */
    previous_start_date: (string & tags.Format<"date-time">) | null;

    /**
     * The start date value after this edit. NULL if start date was not changed
     *
     * @x-autobe-database-schema-property new_start_date
     * @x-autobe-specification Direct mapping from todo_app_todo_edits.new_start_date
     */
    new_start_date: (string & tags.Format<"date-time">) | null;

    /**
     * The due date value before this edit. NULL if due date was not changed
     *
     * @x-autobe-database-schema-property previous_due_date
     * @x-autobe-specification Direct mapping from todo_app_todo_edits.previous_due_date
     */
    previous_due_date: (string & tags.Format<"date-time">) | null;

    /**
     * The due date value after this edit. NULL if due date was not changed
     *
     * @x-autobe-database-schema-property new_due_date
     * @x-autobe-specification Direct mapping from todo_app_todo_edits.new_due_date
     */
    new_due_date: (string & tags.Format<"date-time">) | null;
  };
}
