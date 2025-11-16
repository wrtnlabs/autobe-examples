import { IPage } from "./IPage";
import { ITodoAppGuestUser } from "./ITodoAppGuestUser";

export namespace IPageITodoAppGuestuser {
  /**
   * Paginated collection of guest user identity summaries derived from
   * `todo_app_guestusers`.
   *
   * This DTO is used as the response body for the PATCH
   * `/todoApp/todoAdmin/guestUsers` operation and combines pagination
   * metadata with an array of `ITodoAppGuestUser.ISummary` items. It supports
   * administrative workflows that need to browse, analyze, and filter guest
   * user identities while also understanding the size of the result set.
   *
   * The `pagination` object summarizes the overall search result shape based
   * on `ITodoAppGuestUser.IRequest` criteria, and the `data` array carries
   * only the guest user records for the current page, optimized for
   * lightweight admin list and reporting views.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current view over guest user identity
     * records.
     *
     * This object follows the shared `IPage.IPagination` schema and reports
     * information such as the `current` page index, `limit` page size,
     * total `records` that match the applied filters against
     * `todo_app_guestusers`, and total `pages`. Administrative UIs use this
     * metadata to drive paging controls when listing guest user identities
     * via the PATCH `/todoApp/todoAdmin/guestUsers` endpoint.
     */
    pagination: IPage.IPagination;

    /**
     * List of guest user identity summary entries for the current result
     * page.
     *
     * Each element in this array is an `ITodoAppGuestUser.ISummary` DTO
     * mapped from a row in the `todo_app_guestusers` Prisma model. These
     * summaries expose the essential fields required for administrative
     * list views, such as the guest `id`, `status`, optional
     * `external_reference`, and audit timestamps, enabling administrators
     * to scan, filter, and select guest records for further inspection.
     */
    data: ITodoAppGuestUser.ISummary[];
  };
}
