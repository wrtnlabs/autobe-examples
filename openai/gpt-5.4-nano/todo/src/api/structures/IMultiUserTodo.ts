import { tags } from "typia";

export namespace IMultiUserTodo {
  /**
   * A lightweight representation of a Todo used in paginated list responses. It includes the identifier, title, completion status, creation timestamp, and optionally the planned start/due timestamps (null when not set).
   */
  export type ISummary = {
    /**
     * Unique identifier of the todo item.
     *
     * @x-autobe-specification Return the Todo primary key identifier as a UUID string for the list item.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The todo’s title text.
     *
     * @x-autobe-specification Return the Todo title text exactly as stored.
     */
    title: string;

    /**
     * Whether the todo is marked as completed.
     *
     * @x-autobe-specification Return whether the Todo is marked as completed.
     */
    completed: boolean;

    /**
     * Timestamp when the todo was created.
     *
     * @x-autobe-specification Return the Todo creation timestamp converted to an ISO-8601 date-time string.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Planned start timestamp of the todo, or null when no start time is set.
     *
     * @x-autobe-specification Return the Todo planned start timestamp as an ISO-8601 date-time string when set; otherwise return null.
     */
    startAt: (string & tags.Format<"date-time">) | null;

    /**
     * Scheduled due timestamp of the todo, or null when no due time is set.
     *
     * @x-autobe-specification Return the Todo scheduled due timestamp as an ISO-8601 date-time string when set; otherwise return null.
     */
    dueAt: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Pagination metadata returned alongside multi-user todo list results, indicating the current page position, page size, total matching record count, and total page count.
   */
  export type IPagination = {
    /**
     * Current page number for the current response (non-negative integer).
     *
     * @x-autobe-specification Represent the normalized current page number for list responses. Integer >= 0. For list endpoints, `current` corresponds to request page after normalization.
     */
    current: null;

    /**
     * Maximum number of items requested per page (non-negative integer).
     *
     * @x-autobe-specification Represent the normalized page size (limit) requested for the list response. Integer >= 0.
     */
    limit: null;

    /**
     * Total number of matching todo records across all pages (non-negative integer).
     *
     * @x-autobe-specification Represent total number of matching todo records across all pages for the authenticated member scope and current filters/search criteria, excluding pagination offset/limit. Integer >= 0.
     */
    records: null;

    /**
     * Total number of pages available for the current query (non-negative integer).
     *
     * @x-autobe-specification Represent total number of pages available: if records==0 => 0 else Math.ceil(records/limit). Integer >= 0.
     */
    pages: null;
  };
}
