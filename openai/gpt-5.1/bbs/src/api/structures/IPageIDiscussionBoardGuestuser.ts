import { IPage } from "./IPage";
import { IDiscussionBoardGuestUser } from "./IDiscussionBoardGuestUser";

export namespace IPageIDiscussionBoardGuestuser {
  /**
   * Paginated result wrapper for guest user placeholder accounts stored in
   * the `discussion_board_guestusers` table.
   *
   * This schema is used as the response body type for administrative search
   * operations such as `PATCH /discussionBoard/adminUser/guestUsers`, where
   * administrators request a filtered and ordered slice of guest user
   * placeholders. The `pagination` property captures page-level metadata,
   * while `data` contains a list of `IDiscussionBoardGuestUser.ISummary`
   * entries that summarize individual guest identities for audit and
   * diagnostic workflows.
   *
   * By separating pagination information from the collection of guest
   * summaries, this type supports efficient list UIs and back-office tools
   * that need to iterate over potentially large populations of guest users
   * without exposing internal or sensitive operational details.
   */
  export type ISummary = {
    /**
     * Pagination metadata that describes how the guest user search result
     * set is sliced.
     *
     * This object comes from the generic `IPage.IPagination` schema and
     * reflects the current page index, the configured page size, the total
     * number of guest user placeholder records that match the search
     * criteria, and the corresponding total page count. It allows
     * administrative tools to drive next/previous navigation and to render
     * accurate counts based on the `discussion_board_guestusers` table.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of guest user summary records for the current
     * page.
     *
     * Each element is an `IDiscussionBoardGuestUser.ISummary` projection of
     * a single row from the `discussion_board_guestusers` Prisma model,
     * exposing the guest identifier, opaque `anonymous_token`, and
     * lifecycle timestamps while omitting internal implementation details.
     * The ordering and subset of records respect the filters and sort
     * options supplied via `IDiscussionBoardGuestUser.IRequest` to the
     * `PATCH /discussionBoard/adminUser/guestUsers` endpoint.
     */
    data: IDiscussionBoardGuestUser.ISummary[];
  };
}
