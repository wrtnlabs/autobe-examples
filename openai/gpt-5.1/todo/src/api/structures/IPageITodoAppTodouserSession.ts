import { IPage } from "./IPage";
import { ITodoAppTodouserSession } from "./ITodoAppTodouserSession";

export namespace IPageITodoAppTodouserSession {
  /**
   * Paginated collection of todoApp todo user session summary records for
   * administrative querying.
   *
   * This schema wraps a page of `ITodoAppTodouserSession.ISummary` objects
   * together with pagination metadata so that administrators can efficiently
   * browse login activity for a specific todo user. It is used as the
   * response body of the `PATCH
   * /todoApp/todoAdmin/todoUsers/{todoUserId}/sessions` endpoint, which
   * executes server-side filtering and ordering over the
   * `todo_app_todouser_sessions` table.
   *
   * The `pagination` field describes the current page index, page size, total
   * number of matching session records, and total page count, allowing
   * clients to implement consistent paging UIs. The `data` array contains the
   * actual session summaries for the requested page; when there are no
   * matching sessions, `data` will be an empty array while
   * `pagination.records` will be zero, indicating that the search executed
   * successfully but found no results.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of todo user session
     * summaries.
     *
     * This object describes which page of results is being returned, how
     * many records are included per page, how many total session records
     * exist for the query, and how many pages can be navigated. It always
     * corresponds to the collection of `ITodoAppTodouserSession.ISummary`
     * items exposed in the `data` property for the given administrative
     * search request.
     */
    pagination: IPage.IPagination;

    /**
     * List of todo user session summary records for the requested page.
     *
     * Each element is an `ITodoAppTodouserSession.ISummary` that represents
     * a single authentication session row from the
     * `todo_app_todouser_sessions` Prisma table, enriched with owning user
     * information. The list contains only those sessions that matched the
     * search and filter criteria from `ITodoAppTodouserSession.IRequest`
     * for the specified `todoUserId` and may be empty when no sessions
     * satisfy the conditions.
     */
    data: ITodoAppTodouserSession.ISummary[];
  };
}
