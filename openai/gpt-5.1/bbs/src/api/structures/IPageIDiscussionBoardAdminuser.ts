import { IPage } from "./IPage";
import { IDiscussionBoardAdminuser } from "./IDiscussionBoardAdminuser";

export namespace IPageIDiscussionBoardAdminuser {
  /**
   * Paginated result wrapper for administrator user summaries in the
   * discussion board service.
   *
   * This DTO represents a single page of `IDiscussionBoardAdminUser.ISummary`
   * records backed by the `discussion_board_adminusers` Prisma model. It is
   * used as the response body for operations such as `PATCH
   * /discussionBoard/adminUser/adminUsers`, where backoffice tools search,
   * filter, and sort administrator accounts.
   *
   * The `pagination` field exposes page-level metadata (current page, page
   * size, total records, and total pages), while `data` holds the list of
   * administrator summaries for that page. Together they provide a stable,
   * read-only view that UI grids and management consoles can use to render
   * result lists and navigate through large sets of administrator users
   * without exposing sensitive authentication details.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the administrator user search result set.
     *
     * This object mirrors the paging state derived from the underlying
     * Prisma query against the `discussion_board_adminusers` table,
     * including the current page index, page size limit, total matching
     * administrator records, and total calculated pages.
     *
     * Clients use this information to render paging controls in backoffice
     * UIs and to request subsequent pages while preserving the same filter
     * conditions used in the associated
     * `IDiscussionBoardAdminUser.IRequest` search.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of administrator account summaries returned for
     * the current page.
     *
     * Each element is an `IDiscussionBoardAdminUser.ISummary` projection of
     * a row in the `discussion_board_adminusers` model, containing
     * non-sensitive identification and role information suitable for
     * administrative list views.
     *
     * The array may be empty when the search yields no matching
     * administrators for the requested filter and page, but it is always
     * present so that clients can reliably iterate without additional null
     * checks.
     */
    data: IDiscussionBoardAdminuser.ISummary[];
  };
}
