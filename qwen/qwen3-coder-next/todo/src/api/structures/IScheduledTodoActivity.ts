import { tags } from "typia";

export namespace IScheduledTodoActivity {
  /**
   * Query parameters for filtering and paginating activity analytics data. Supports filtering by completion status, date ranges, edit frequency, and sorting by various activity metrics.
   */
  export type IRequest = {
    /**
     * Filter by completion status. Allow values: 'all', 'complete', 'incomplete'.
     *
     * @x-autobe-specification Filter by todo completion status. Allow values: 'all' (all todos), 'complete' (completed todos only), 'incomplete' (uncompleted todos only). Applied to todo_app_todos.isComplete field.
     */
    status: string;

    /**
     * Start date range for todo creation filtering. Filter todos created on or after this datetime.
     *
     * @x-autobe-specification Start date range for filtering todo creation timestamps. Filters todos created on or after this datetime in todo_app_todos.createdAt. Use ISO 8601 datetime format.
     */
    startDateRange?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date range for todo creation filtering. Filter todos created before this datetime.
     *
     * @x-autobe-specification End date range for filtering todo creation timestamps. Filters todos created before this datetime in todo_app_todos.createdAt. Use ISO 8601 datetime format.
     */
    endDateRange?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Start date range for edit activity filtering. Filter edits performed on or after this datetime.
     *
     * @x-autobe-specification Start date range for filtering edit timestamps. Filters edits performed on or after this datetime in todo_app_todo_edits.editedAt. Use ISO 8601 datetime format.
     */
    editStartDateRange?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date range for edit activity filtering. Filter edits performed before this datetime.
     *
     * @x-autobe-specification End date range for filtering edit timestamps. Filters edits performed before this datetime in todo_app_todo_edits.editedAt. Use ISO 8601 datetime format.
     */
    editEndDateRange?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Minimum edit count threshold for filtering. Only include todos with this many or more edit history records.
     *
     * @x-autobe-specification Minimum edit count threshold. Filters todos with at least this many edit history records. Join todo_app_todos with todo_app_todo_edits and use COUNT aggregation grouped by todo ID.
     */
    minEditCount?: (number & tags.Type<"int32">) | undefined;

    /**
     * Field to sort by. Allow values: 'createdAt', 'dueAt', 'lastEditAt'.
     *
     * @x-autobe-specification Field to sort todo list by. Allow values: 'createdAt' (todo creation time), 'dueAt' (todo due date), 'lastEditAt' (most recent edit timestamp). Map to todo_app_todos columns or subquery for last edit timestamp.
     */
    sortField?: string | undefined;

    /**
     * Sort order. Allow values: 'asc', 'desc'.
     *
     * @x-autobe-specification Sort direction for ordered results. Allow values: 'asc' (ascending), 'desc' (descending). Applied to the field specified in sortField parameter.
     */
    sortOrder?: string | undefined;

    /**
     * Pagination offset (default 0). Number of records to skip before starting to return results.
     *
     * @x-autobe-specification Pagination offset for list queries. Number of records to skip before starting to return results. Default 0. Combined with limit to implement cursor-style pagination over todo_app_todos.
     */
    offset?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Pagination limit, max 100 (default 10). Maximum number of records to return per page.
     *
     * @x-autobe-specification Pagination limit for list queries. Maximum number of records to return per page. Range 1-100, default 10. Used to control result set size for todo_app_todos queries.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Target page number to retrieve (1-indexed). Specifies which page of results to return. Page numbering starts from 1. If omitted, defaults to page 1.
     *
     * @x-autobe-specification Target page number to retrieve (1-indexed). Specifies which page of results to return. Page numbering starts from 1. If omitted, null, or undefined, defaults to page 1 (first page). Requesting a page beyond the available range returns an empty data array with valid pagination metadata reflecting the actual totals.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Summary of scheduled todo activity for analytics dashboard.
   */
  export type ISummary = {
    /**
     * Type of activity event (created, completed, or edited).
     *
     * @x-autobe-specification Computed from entity type: 'created' from todo creation, 'completed' from completion toggle, 'edited' from edit history.
     */
    activity_type: "created" | "completed" | "edited";

    /**
     * Date when the activity events occurred.
     *
     * @x-autobe-specification Grouped aggregation timestamp (date) of activity events.
     */
    timestamp: string & tags.Format<"date-time">;

    /**
     * Number of activity events for this type and date.
     *
     * @x-autobe-specification COUNT of activity events grouped by activity type and date.
     */
    count: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
