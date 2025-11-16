import { IPage } from "./IPage";
import { ITodoAppTodoAdminSession } from "./ITodoAppTodoAdminSession";

export namespace IPageITodoAppTodoadminSession {
  /**
   * Paginated collection of Todo administrator session summaries for a single
   * administrator.
   *
   * This schema represents the response envelope used when listing sessions
   * from the `todo_app_todoadmin_sessions` table for a specific Todo
   * administrator, as seen in the
   * `/todoApp/todoAdmin/todoAdmins/{todoAdminId}/sessions` operation. It
   * combines a standardized pagination block with an array of
   * `ITodoAppTodoAdminSession.ISummary` records so that administrative tools
   * can browse the administrator's historical and active sessions page by
   * page.
   *
   * The `pagination` property follows the shared `IPage.IPagination` contract
   * and describes where the current page sits within the overall result set
   * (for example, which page is being viewed and how many records exist in
   * total). The `data` array contains the session summaries for that page
   * only, allowing clients to render list views, drill into individual
   * sessions when needed, and drive subsequent page requests using the
   * metadata in `pagination`.
   */
  export type ISummary = {
    /**
     * Page-level pagination metadata for the administrator session list.
     *
     * This field wraps information such as the current page index, the
     * maximum number of records per page, and overall record and page
     * counts. It follows the shared `IPage.IPagination` structure so that
     * all paginated responses in the service expose a consistent pagination
     * contract.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of Todo administrator session summaries for the current
     * page.
     *
     * Each element in this array is an `ITodoAppTodoAdminSession.ISummary`
     * instance that represents one row from the
     * `todo_app_todoadmin_sessions` Prisma table, enriched with the related
     * administrator summary. The array contains only the sessions that fall
     * within the slice of data defined by the `pagination` object.
     */
    data: ITodoAppTodoAdminSession.ISummary[];
  };
}
