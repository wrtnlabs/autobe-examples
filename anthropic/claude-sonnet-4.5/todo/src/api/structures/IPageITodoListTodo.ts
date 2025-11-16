import { IPage } from "./IPage";
import { ITodoListTodo } from "./ITodoListTodo";

export namespace IPageITodoListTodo {
  /**
   * Paginated response containing a list of todo items with metadata for the
   * authenticated user.
   *
   * This schema represents the complete response structure returned by the
   * todo list retrieval endpoint (PATCH /todoList/user/todos). It combines
   * the actual todo data with pagination information to enable efficient
   * browsing of potentially large todo lists.
   *
   * The response is structured as a standard paginated collection following
   * the IPage pattern used throughout the API. This consistency enables
   * clients to implement reusable pagination components across different list
   * views.
   *
   * All data is automatically scoped to the authenticated user based on their
   * JWT token, ensuring complete privacy and data ownership. The todo items
   * are sourced from the todo_list_todos Prisma table with automatic
   * filtering by the user's todo_list_user_id.
   *
   * This schema is used exclusively for search and list operations where
   * users need to browse, filter, and navigate through their todo
   * collections. The summary format of individual todos is optimized for list
   * rendering performance, excluding verbose fields like full descriptions
   * while retaining essential information for task identification and status
   * display.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the todo list response.
     *
     * Provides comprehensive pagination information including current page
     * number, page size limit, total record count, and total page count.
     * This enables clients to implement proper pagination controls and
     * display accurate page navigation UI.
     *
     * The pagination object follows the standard IPage.IPagination
     * structure used throughout the API for consistent pagination handling
     * across all list endpoints. Clients can use this information to
     * calculate page ranges, determine if next/previous pages exist, and
     * display "showing X-Y of Z" indicators.
     *
     * All pagination calculations account for the user's total accessible
     * todos, which are automatically scoped to only the authenticated
     * user's todo items for privacy and data ownership compliance.
     */
    pagination: IPage.IPagination;

    /**
     * Array of todo items for the current page in summary format.
     *
     * Contains the actual todo records matching the search and filter
     * criteria specified in the request. Each todo is represented in
     * summary format (ITodoListTodo.ISummary) which includes essential
     * fields optimized for list display: id, title, completion status, and
     * creation timestamp.
     *
     * The number of items in this array is controlled by the limit
     * parameter in the request (maximum 100 items per page). The specific
     * items returned depend on the page number, applied filters (completion
     * status, priority, due date ranges), search terms, and sort order.
     *
     * All todos in this array belong exclusively to the authenticated user,
     * as enforced by automatic user_id scoping in the backend. This ensures
     * complete data isolation and privacy between different users' todo
     * lists.
     */
    data: ITodoListTodo.ISummary[];
  };
}
