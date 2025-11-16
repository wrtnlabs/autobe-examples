import { IPage } from "./IPage";
import { ICommunityPlatformModerationAction } from "./ICommunityPlatformModerationAction";

export namespace IPageICommunityPlatformModerationAction {
  /**
   * Paginated collection of moderation action summaries for the community
   * platform.
   *
   * This schema wraps a list of `ICommunityPlatformModerationAction.ISummary`
   * items—each derived from the `community_platform_moderation_actions`
   * Prisma model—together with standard pagination metadata. It is used by
   * moderation dashboards, report detail views, and search endpoints that
   * list how reports have been handled over time, enabling clients to
   * navigate large moderation histories efficiently.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this moderation action page.
     *
     * This object follows the shared `IPage.IPagination` contract and
     * exposes values such as the current page index, the maximum number of
     * items per page, the total number of matching moderation actions, and
     * the total number of pages. Clients use this information to render
     * pagination controls and to request subsequent pages when browsing
     * moderation histories.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered list of moderation action summary records in the current
     * page.
     *
     * Each element is an `ICommunityPlatformModerationAction.ISummary` DTO,
     * representing a single row from the
     * `community_platform_moderation_actions` Prisma model projected into a
     * lightweight view suitable for timelines, queues, and audit lists. The
     * set of records respects the filters and sorting options expressed in
     * the corresponding `ICommunityPlatformModerationAction.IRequest` that
     * produced this page.
     */
    data: ICommunityPlatformModerationAction.ISummary[];
  };
}
