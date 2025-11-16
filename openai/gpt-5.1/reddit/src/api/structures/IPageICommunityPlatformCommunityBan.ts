import { IPage } from "./IPage";
import { ICommunityPlatformCommunityBan } from "./ICommunityPlatformCommunityBan";

export namespace IPageICommunityPlatformCommunityBan {
  /**
   * Paginated collection of community-level ban summaries for moderation and
   * safety workflows.
   *
   * This wrapper DTO is used by list-style endpoints that query the
   * `community_platform_community_bans` table, often in combination with
   * related models such as `community_platform_communities` and
   * `community_platform_memberusers`, to present a page of bans matching
   * specific search criteria (for example, all active bans in a community or
   * the full ban history for a member user).
   *
   * The `pagination` field describes how the dataset has been sliced for the
   * current response, while the `data` array contains the corresponding
   * `ICommunityPlatformCommunityBan.ISummary` rows that can be rendered
   * directly in moderator consoles, admin dashboards, or reporting tools.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of community ban results.
     *
     * This object follows the shared `IPage.IPagination` structure and
     * captures the current page index, page size, total number of records,
     * and total number of pages computed over the
     * `community_platform_community_bans` dataset (optionally scoped by
     * community or member user).
     *
     * Client applications use this information to render paging controls,
     * calculate whether additional pages are available, and coordinate
     * subsequent list requests when navigating through large ban
     * histories.
     */
    pagination: IPage.IPagination;

    /**
     * List of community-level ban summary records included in the current
     * page.
     *
     * Each element in this array is an
     * `ICommunityPlatformCommunityBan.ISummary` DTO that aggregates
     * information from the `community_platform_community_bans` Prisma model
     * together with related entities such as
     * `community_platform_communities` and
     * `community_platform_memberusers`.
     *
     * These summaries are optimized for moderation views and dashboards,
     * exposing key attributes like the banned user, target community, ban
     * period, and active status rather than the full underlying audit
     * detail.
     */
    data: ICommunityPlatformCommunityBan.ISummary[];
  };
}
