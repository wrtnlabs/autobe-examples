import { IPage } from "./IPage";
import { ITodoAppTodo } from "./ITodoAppTodo";

export namespace IPageITodoAppTodo {
  /**
   * Paginated collection of todo summary records for the todoApp service.
   *
   * This DTO is used as the response body type for list/search operations
   * that return multiple todo items, most notably the `PATCH
   * /todoApp/todoUser/todos` endpoint. It wraps an array of
   * `ITodoAppTodo.ISummary` objects—each mapped from a row in the
   * `todo_app_todos` Prisma table—together with paging information so clients
   * can navigate large result sets efficiently.
   *
   * The `pagination` property conveys the current page index, page size, and
   * total counts for the todo query, while the `data` array contains only the
   * todos belonging to the authenticated user and matching the applied
   * filters. This structure is intentionally lightweight and read-only,
   * optimized for list views and dashboards rather than for mutation or
   * detailed inspection of a single todo.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this todo list response.
     *
     * This object follows the `IPage.IPagination` structure and describes
     * the current page index, page size limit, total number of todo records
     * that match the applied filters, and the total number of pages
     * available. It is computed from the underlying `todo_app_todos` query
     * that backs the `PATCH /todoApp/todoUser/todos` operation.
     *
     * Consumers use this information to implement paging controls such as
     * next/previous navigation and to understand how many todos remain
     * beyond the current page.
     */
    pagination: IPage.IPagination;

    /**
     * Array of todo summary records for the current page.
     *
     * Each element is an `ITodoAppTodo.ISummary` instance, representing a
     * lightweight view of a single todo item derived from a row in the
     * `todo_app_todos` Prisma model. These summaries expose essential
     * fields such as identifiers, titles, status information (via
     * `ITodoAppTodoStatus.ISummary`), and key timestamps while omitting
     * heavier fields like long descriptions.
     *
     * The list corresponds to the subset of todos owned by the
     * authenticated todo user that satisfy the filters specified in
     * `ITodoAppTodo.IRequest`, ordered and limited according to the
     * supplied paging and sorting options.
     */
    data: ITodoAppTodo.ISummary[];
  };
}
