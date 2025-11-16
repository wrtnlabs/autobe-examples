import { IPage } from "./IPage";
import { ITodoAppGuestUserSession } from "./ITodoAppGuestUserSession";

export namespace IPageITodoAppGuestuserSession {
  /**
   * Paginated container of guest user session summaries for a specific guest
   * user.
   *
   * This type is used as the response body for the administrative PATCH
   * `/todoApp/todoAdmin/guestUsers/{guestUserId}/sessions` operation, which
   * lists session records from the `todo_app_guestuser_sessions` table
   * belonging to a single guest user. The `pagination` field exposes page
   * metadata such as current page, limit, total records, and total pages,
   * while the `data` array contains `ITodoAppGuestUserSession.ISummary`
   * entries representing individual session rows.
   *
   * Administrators and monitoring tools rely on this structure to navigate
   * large sets of guest session telemetry, inspect session identifiers and
   * key timestamps, and correlate activity with the owning guest user without
   * loading full session details in a single response.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the guest user session search result.
     *
     * This object describes the current paging state for the list of
     * `ITodoAppGuestUserSession.ISummary` records, including the current
     * page index, per‑page limit, total number of matching session rows,
     * and total page count. It is derived from the query executed against
     * the `todo_app_guestuser_sessions` table for the targeted guest user.
     */
    pagination: IPage.IPagination;

    /**
     * List of guest user session summary records for the requested page.
     *
     * Each element is an `ITodoAppGuestUserSession.ISummary` instance that
     * corresponds to a single row in the `todo_app_guestuser_sessions`
     * Prisma model, scoped to the guest user identified by the
     * `guestUserId` path parameter of the PATCH
     * `/todoApp/todoAdmin/guestUsers/{guestUserId}/sessions` endpoint. The
     * collection represents only the sessions that satisfy the applied
     * filters and fall within the current pagination window.
     */
    data: ITodoAppGuestUserSession.ISummary[];
  };
}
