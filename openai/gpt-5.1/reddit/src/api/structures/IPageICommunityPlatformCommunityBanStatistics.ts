import { IPage } from "./IPage";
import { ICommunityPlatformCommunityBanStatistics } from "./ICommunityPlatformCommunityBanStatistics";

export namespace IPageICommunityPlatformCommunityBanStatistics {
  /**
   * Paginated collection of community ban statistic summaries derived from
   * `community_platform_community_bans`.
   *
   * This DTO encapsulates a single page of
   * `ICommunityPlatformCommunityBanStatistics.ISummary` records, together
   * with standard pagination metadata, for use in moderation and safety
   * analytics dashboards. It is designed for endpoints such as
   * `/communityPlatform/platformAdmin/statistics/communities/bans`, where
   * administrators need to inspect ban trends across communities over time
   * without loading the entire dataset in a single response.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the community ban statistics result set.
     *
     * This object describes which portion of the overall ban analytics is
     * included in the response, including the current page number, maximum
     * number of records per page, total number of matching ban statistic
     * summaries, and the total number of pages. It reuses the shared
     * `IPage.IPagination` schema so that administrative tools can handle
     * pagination consistently across different moderation analytics
     * endpoints.
     */
    pagination: IPage.IPagination;

    /**
     * List of community ban statistic summaries for the current page.
     *
     * Each array element is an
     * `ICommunityPlatformCommunityBanStatistics.ISummary` record that
     * aggregates ban-related moderation metrics for a single community over
     * a defined time window, such as totalBans, temporaryBans,
     * permanentBans, liftedBans, and activeBannedMembers. These summaries
     * are produced from the `community_platform_community_bans` table and
     * related metadata and are typically consumed by platform
     * administrators via endpoints like
     * `/communityPlatform/platformAdmin/statistics/communities/bans`.
     */
    data: ICommunityPlatformCommunityBanStatistics.ISummary[];
  };
}
