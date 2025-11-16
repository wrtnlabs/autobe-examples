import { IPage } from "./IPage";
import { IDiscussionBoardMemberuserSession } from "./IDiscussionBoardMemberuserSession";

export namespace IPageIDiscussionBoardMemberuserSession {
  /**
   * Paginated result wrapper for member user session summaries in the
   * discussion board service.
   *
   * This DTO encapsulates a single page of
   * `IDiscussionBoardMemberuserSession.ISummary` objects queried from the
   * `discussion_board_memberuser_sessions` Prisma model for a particular
   * member user. It is used by endpoints such as `PATCH
   * /discussionBoard/adminUser/memberUsers/{memberUserId}/sessions` to
   * deliver a navigable list of sessions to administrative or security
   * dashboards.
   *
   * The `pagination` field captures the current paging state across the
   * member's session history, while `data` contains the list of individual
   * session summaries for the requested slice. This structure provides a
   * read-only, audit-friendly view that allows operators or the member user
   * themself to inspect where and when the account has been active without
   * exposing raw tokens or low-level authentication internals.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the session history of a specific member
     * user.
     *
     * These values are computed from the Prisma query executed against the
     * `discussion_board_memberuser_sessions` table scoped by the parent
     * member user's identifier, taking into account any date range filters
     * or other criteria provided in
     * `IDiscussionBoardMemberuserSession.IRequest`.
     *
     * Clients rely on this pagination block to render page controls in
     * security and audit views, and to request previous or next slices of
     * the member's session history in a predictable way.
     */
    pagination: IPage.IPagination;

    /**
     * List of session summary DTOs representing individual authenticated
     * sessions for the target member user.
     *
     * Each item is an `IDiscussionBoardMemberuserSession.ISummary`
     * projection of a row in the `discussion_board_memberuser_sessions`
     * model, providing lightweight information such as creation time, IP,
     * URLs, and activity flags that are safe to expose in audit tooling.
     *
     * The array can be empty when the member user has no sessions that
     * match the supplied filters or when the requested page is beyond the
     * last page, but it is always present so that consumers can treat it as
     * a canonical container for session rows.
     */
    data: IDiscussionBoardMemberuserSession.ISummary[];
  };
}
