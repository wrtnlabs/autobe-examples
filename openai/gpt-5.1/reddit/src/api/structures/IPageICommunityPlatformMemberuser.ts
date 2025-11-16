import { IPage } from "./IPage";
import { ICommunityPlatformMemberuser } from "./ICommunityPlatformMemberuser";

export namespace IPageICommunityPlatformMemberuser {
  /**
   * Paginated collection of member user summaries for administrative search
   * and management views.
   *
   * This DTO wraps the standard pagination metadata from `IPage.IPagination`
   * together with an array of `ICommunityPlatformMemberUser.ISummary`
   * records. It is used as the response contract for endpoints such as
   * `/communityPlatform/platformAdmin/memberUsers`, which query the
   * `community_platform_memberusers` Prisma model using rich filter criteria
   * defined in `ICommunityPlatformMemberUser.IRequest`.
   *
   * The `pagination` property describes how the overall member user result
   * set is sliced into pages, while `data` contains the concrete subset of
   * member user summaries for the requested page. Administrative UIs can use
   * this structure to render tables, apply further client-side filtering, and
   * drive pagination controls while reliably understanding how many accounts
   * match the current search conditions.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Contains the current page index, page size, total record count, and
     * total page count for this member user search result.
     */
    pagination: IPage.IPagination;

    /**
     * List of member user summary records for the current page of the
     * search result.
     *
     * Each item is an `ICommunityPlatformMemberUser.ISummary` instance that
     * exposes a lightweight view of a registered member account suitable
     * for administrative list screens.
     */
    data: ICommunityPlatformMemberuser.ISummary[];
  };
}
