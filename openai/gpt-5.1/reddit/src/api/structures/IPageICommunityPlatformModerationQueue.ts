import { IPage } from "./IPage";
import { ICommunityPlatformModerationQueue } from "./ICommunityPlatformModerationQueue";

export namespace IPageICommunityPlatformModerationQueue {
  /**
   * Paginated wrapper for moderation queue summary records retrieved from the
   * `community_platform_moderation_queues` table.
   *
   * The `data` array contains `ICommunityPlatformModerationQueue.ISummary`
   * entities representing logical queues that organize reports and appeals,
   * while `pagination` conveys the paging state of the query. This DTO is
   * primarily used in internal moderation and administration tools to list,
   * search, and navigate queue configurations across communities and
   * platform-level routing setups.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this moderation queue list page.
     *
     * The structure follows `IPage.IPagination` and describes which slice
     * of `community_platform_moderation_queues` has been returned: the
     * current page index, page size, total number of queues matching the
     * filter, and computed page count. Moderation tooling uses this
     * information to drive paging controls when browsing or configuring
     * multiple queues.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of moderation queue summaries included in the
     * current page.
     *
     * Each element is an `ICommunityPlatformModerationQueue.ISummary` DTO
     * mapped from a row in the `community_platform_moderation_queues`
     * Prisma model, exposing identifiers, names, queue types, statuses, and
     * optional community bindings. This array is used by community
     * moderator and platform administrator UIs to render index views,
     * selection dialogs, and configuration lists for moderation queues
     * without loading full queue details.
     */
    data: ICommunityPlatformModerationQueue.ISummary[];
  };
}
