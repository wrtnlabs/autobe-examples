import { IPage } from "./IPage";
import { ICommunityPlatformUserSanction } from "./ICommunityPlatformUserSanction";

export namespace IPageICommunityPlatformUserSanction {
  /**
   * Paginated collection of user sanction summaries returned from the
   * community platform.
   *
   * This wrapper combines standard pagination information with an array of
   * `ICommunityPlatformUserSanction.ISummary` items derived from the
   * `community_platform_user_sanctions` Prisma model. It is returned by
   * sanction search endpoints used in moderation dashboards and
   * administrative tools to inspect active, scheduled, expired, or revoked
   * sanctions across communities and at the platform level.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this user sanction page.
     *
     * The pagination object conforms to the shared `IPage.IPagination`
     * structure and describes the current page index, page size, total
     * number of sanction records that matched the search criteria, and the
     * total number of available pages. UIs rely on this information to
     * render paging controls when exploring sanction history.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered list of user sanction summary records contained in the
     * current page.
     *
     * Each entry is an `ICommunityPlatformUserSanction.ISummary` DTO,
     * representing a single sanction row from the
     * `community_platform_user_sanctions` Prisma model. The items reflect
     * the filters, scopes, and sorting parameters defined in
     * `ICommunityPlatformUserSanction.IRequest`, and are used in moderation
     * consoles and safety dashboards to review and audit enforcement
     * actions applied to user accounts.
     */
    data: ICommunityPlatformUserSanction.ISummary[];
  };
}
