import { IPage } from "./IPage";
import { ITodoAppTodoAdmin } from "./ITodoAppTodoAdmin";

export namespace IPageITodoAppTodoadmin {
  /**
   * Paginated collection of Todo administrator account summaries used for
   * operational and audit-focused listings.
   *
   * This schema represents the response body of the `PATCH
   * /todoApp/todoAdmin/todoAdmins` endpoint, which searches the
   * `todo_app_todoadmins` Prisma table based on free-text search terms,
   * status filters, and pagination parameters. It bundles together high-level
   * information about administrator accounts with structured pagination
   * metadata so that administrative consoles can render large result sets
   * efficiently.
   *
   * The `pagination` property exposes page index, page size, total matching
   * admin count, and total pages, all derived from the executed query. The
   * `data` array holds the `ITodoAppTodoAdmin.ISummary` objects for the
   * current page; when no administrators match the search conditions, `data`
   * will be an empty array and `pagination.records` will be zero, indicating
   * an empty but valid result set.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current result set of administrator
     * summaries.
     *
     * This object captures which page of administrator accounts is being
     * returned, the configured page size, the total number of matching
     * admin records in `todo_app_todoadmins`, and the total page count,
     * allowing operator-facing UIs to provide consistent navigation
     * controls.
     */
    pagination: IPage.IPagination;

    /**
     * List of Todo administrator account summaries for the requested page.
     *
     * Each element is an `ITodoAppTodoAdmin.ISummary` representing a single
     * row from the `todo_app_todoadmins` Prisma table, containing
     * non-sensitive identification and lifecycle information about an
     * administrative actor. The array contains only records that matched
     * the filters defined in `ITodoAppTodoAdmin.IRequest` and may be empty
     * when no administrators satisfy the search criteria.
     */
    data: ITodoAppTodoAdmin.ISummary[];
  };
}
