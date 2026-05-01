import { tags } from "typia";

export namespace ITodoAppEditHistory {
  /**
   * Pagination parameters for browsing a todo's edit history list.
   *
   * Edit history entries are always sorted from most recent to oldest, showing how the todo has changed over time. The parent todo is determined by the URL path — not included in this request body. No search or filtering parameters are exposed because the edit history list is scoped to a single todo and sorted chronologically.
   */
  export type IRequest = {
    /**
     * Page number for cursor-based or offset-based pagination.
     *
     * 1-indexed: the first page is page 1. When omitted, defaults to page 1.
     *
     * Used to navigate through the edit history entries when the total count exceeds the page size. The system returns up to limit records starting from the offset calculated as (page - 1) × limit.
     *
         * @x-autobe-specification 1-indexed page number for offset-based
         *   pagination. Defaults to 1 when omitted. Not a database column —
         *   this is a query parameter used to calculate the OFFSET in the SQL
         *   query: OFFSET = (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of edit history entries returned per page.
     *
     * Controls the page size for pagination. Must be between 1 and 100 inclusive. When omitted, the server applies a sensible default (typically 20).
     *
     * The actual number of records returned may be less than this value on the final page or when the total count is below the limit.
     *
         * @x-autobe-specification Maximum records per page for LIMIT clause.
         *   Must be between 1 and 100 inclusive. Defaults to 20 when omitted.
         *   Not a database column — this is a query parameter used directly as
         *   the LIMIT in the SQL query.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * A summary view of a single todo edit history entry.
   *
   * Each entry captures the state of the todo's editable fields — title, description, start date, and due date — at the moment a specific edit was applied. The entry also records when the edit occurred via the created_at timestamp.
   *
   * Field snapshots that were not modified in that particular edit are returned as null. For example, if an edit only changed the title, the description, start_date, and due_date fields will all be null. The title field is always populated because every todo is required to have a title per business rules.
   *
   * Edit history entries are immutable — once created, they cannot be modified or individually deleted. The only removal path is cascade deletion when the parent todo is permanently deleted from the trash.
   */
  export type ISummary = {
    /**
     * Unique identifier for this edit history entry.
     *
     * A UUID v4 string that uniquely identifies this specific edit record. Auto-generated when the edit history entry is created and never changes.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   todo_app_edit_histories.id. UUID primary key, auto-generated on
         *   creation. Immutable after creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The title of the todo after this edit was applied.
     *
     * This field is always populated because every todo is required to have a title. It reflects the title as it existed immediately after the edit represented by this history entry was saved.
     *
         * @x-autobe-database-schema-property title
         * @x-autobe-specification Direct mapping from
         *   todo_app_edit_histories.title. Always non-null — every todo must
         *   have a title per business rules. This captures the title as it
         *   existed immediately after the edit was saved.
     */
    title: string;

    /**
     * The description of the todo after this edit was applied, or null.
     *
     * Returns null in two cases: when the description field was not part of the changes in this particular edit, or when the description was explicitly cleared (set to empty) during the edit. When a non-null string is returned, it reflects the exact description text that was saved.
     *
         * @x-autobe-database-schema-property description
         * @x-autobe-specification Direct mapping from
         *   todo_app_edit_histories.description. Nullable — null when the
         *   description field was not changed in this particular edit, or when
         *   the description was explicitly cleared to empty.
     */
    description: string | null;

    /**
     * The start date of the todo after this edit was applied, or null.
     *
     * An ISO 8601 datetime string representing when work on the task is intended to begin. Returns null when the start date was not modified in this edit or when it was explicitly unset. When both start_date and due_date are set on the parent todo, the service layer enforces that due_date must not be earlier than start_date.
     *
         * @x-autobe-database-schema-property start_date
         * @x-autobe-specification Direct mapping from
         *   todo_app_edit_histories.start_date. Nullable — null when the start
         *   date was not changed in this edit, or when it was explicitly
         *   cleared. When both start_date and due_date are set on the parent
         *   todo, the service layer enforces due_date >= start_date.
     */
    start_date: (string & tags.Format<"date-time">) | null;

    /**
     * The due date of the todo after this edit was applied, or null.
     *
     * An ISO 8601 datetime string representing the deadline by which the task should be completed. Returns null when the due date was not modified in this edit or when it was explicitly unset. When both start_date and due_date are set on the parent todo, the service layer enforces that due_date must not be earlier than start_date.
     *
         * @x-autobe-database-schema-property due_date
         * @x-autobe-specification Direct mapping from
         *   todo_app_edit_histories.due_date. Nullable — null when the due date
         *   was not changed in this edit, or when it was explicitly cleared.
         *   When both start_date and due_date are set on the parent todo, the
         *   service layer enforces due_date >= start_date.
     */
    due_date: (string & tags.Format<"date-time">) | null;

    /**
     * Timestamp of when this edit occurred.
     *
     * An ISO 8601 datetime string set automatically when the edit history entry is created. This value never changes and serves as both the record's creation timestamp and the edit timestamp visible to the user in the history listing. Edit history entries are presented in reverse chronological order (most recent first) based on this field.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   todo_app_edit_histories.created_at. Set automatically on creation
         *   and never changes. Serves as both the record's creation timestamp
         *   and the edit timestamp shown to the user. Edit history entries are
         *   sorted in reverse chronological order (most recent first) by this
         *   field.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
