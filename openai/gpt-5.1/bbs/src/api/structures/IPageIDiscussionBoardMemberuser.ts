import { IPage } from "./IPage";
import { IDiscussionBoardMemberuser } from "./IDiscussionBoardMemberuser";

export namespace IPageIDiscussionBoardMemberuser {
  /**
   * Paginated result wrapper for registered member user accounts stored in
   * the `discussion_board_memberusers` table.
   *
   * This schema is used as the response body type for administrative search
   * endpoints such as `PATCH /discussionBoard/adminUser/memberUsers`, where
   * operators query member accounts by lifecycle status, email verification
   * state, registration windows, or activity periods. The `pagination`
   * property describes the overall result window, while `data` contains an
   * array of `IDiscussionBoardMemberUser.ISummary` records that present
   * concise but sufficient information for list screens and dashboards.
   *
   * The design of this DTO ensures that bulk member listings expose only
   * non-sensitive fields appropriate for back-office tooling, while more
   * detailed account or security information remains confined to dedicated
   * detail endpoints and internal services.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing how the member user search results are
     * segmented.
     *
     * This object follows the `IPage.IPagination` contract and reports the
     * current page number, page size, total number of matching member user
     * records, and total page count. It is derived from queries executed
     * against the `discussion_board_memberusers` Prisma model using the
     * filters and sort configuration supplied in
     * `IDiscussionBoardMemberUser.IRequest`.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of member user summary projections representing the
     * current page slice.
     *
     * Each item is an `IDiscussionBoardMemberUser.ISummary` DTO that wraps
     * non-sensitive account metadata from a row in the
     * `discussion_board_memberusers` table, such as the member identifier,
     * display name, account_status, and creation timestamp.
     * Credential-related fields like `password_hash` are intentionally
     * excluded so that this page response can be safely consumed by
     * administrative listing and moderation views.
     */
    data: IDiscussionBoardMemberuser.ISummary[];
  };
}
