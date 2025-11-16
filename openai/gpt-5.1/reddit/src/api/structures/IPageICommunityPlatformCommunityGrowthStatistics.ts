import { IPage } from "./IPage";
import { ICommunityPlatformCommunityGrowthStatistics } from "./ICommunityPlatformCommunityGrowthStatistics";

export namespace IPageICommunityPlatformCommunityGrowthStatistics {
  /**
   * Paginated collection of community growth statistic summaries derived from
   * `community_platform_community_memberships`.
   *
   * This DTO wraps a page of
   * `ICommunityPlatformCommunityGrowthStatistics.ISummary` records along with
   * standard pagination metadata, allowing analytics and reporting clients to
   * retrieve community growth metrics in a scalable, page-by-page fashion. It
   * is primarily used as the response type for analytics endpoints such as
   * `/communityPlatform/statistics/communities/growth`, where each page
   * represents a subset of communities and time buckets that meet the
   * specified filters and time range.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the community growth statistics result set.
     *
     * This object describes which slice of the overall growth statistics is
     * being returned, including the current page index, page size, total
     * number of records across all pages, and the total number of pages
     * available. Its structure follows the shared `IPage.IPagination`
     * schema so that clients can use the same pagination handling logic
     * across different analytics endpoints.
     */
    pagination: IPage.IPagination;

    /**
     * List of community growth statistic summaries for the current page.
     *
     * Each element is an
     * `ICommunityPlatformCommunityGrowthStatistics.ISummary` record that
     * captures high-level membership and activity metrics (such as
     * newMembers, lostMembers, netMemberChange, activeMembers, newPosts,
     * and newComments) for a single community over a specific time window.
     * Together, these records represent the paginated subset of all
     * communities and time windows that match the request parameters
     * supplied to endpoints like
     * `/communityPlatform/statistics/communities/growth`.
     */
    data: ICommunityPlatformCommunityGrowthStatistics.ISummary[];
  };
}
