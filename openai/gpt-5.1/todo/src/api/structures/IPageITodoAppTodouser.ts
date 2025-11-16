import { IPage } from "./IPage";
import { ITodoAppTodoUser } from "./ITodoAppTodoUser";

export namespace IPageITodoAppTodouser {
  /**
   * Paginated container of Todo user account summaries for administrative
   * search.
   *
   * This schema models the response body of the PATCH
   * `/todoApp/todoAdmin/todoUsers` operation, which lets todoAdmin actors
   * search and list registered end‑user accounts stored in the
   * `todo_app_todousers` table. The `pagination` property reports page‑level
   * metrics such as current page, per‑page limit, total matching accounts,
   * and total pages, while the `data` array carries
   * `ITodoAppTodoUser.ISummary` entries representing individual user
   * accounts.
   *
   * Admin consoles and support tools use this structure to page through large
   * populations of Todo users, investigate account status and activity, and
   * select specific users for further inspection or management, all without
   * exposing confidential authentication details like password hashes.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the Todo user account search result.
     *
     * This object captures the current paging position, including the page
     * index, page size, total number of matching `todo_app_todousers` rows,
     * and total page count. It is computed from the filters and limits
     * provided in the `ITodoAppTodoUser.IRequest` search payload used by
     * the PATCH `/todoApp/todoAdmin/todoUsers` endpoint.
     */
    pagination: IPage.IPagination;

    /**
     * List of Todo user account summary records for the current page.
     *
     * Each element is an `ITodoAppTodoUser.ISummary` instance that
     * summarises a single registered user row from the `todo_app_todousers`
     * Prisma model, exposing non‑sensitive fields such as id, email,
     * display name, status, and key timestamps. The array contains only
     * those accounts that match the applied search, filter, and sort
     * criteria and fall within the selected pagination window.
     */
    data: ITodoAppTodoUser.ISummary[];
  };
}
