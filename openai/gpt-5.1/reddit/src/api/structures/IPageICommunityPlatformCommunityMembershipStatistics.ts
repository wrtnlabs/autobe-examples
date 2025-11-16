import { IPage } from "./IPage";
import { ICommunityPlatformCommunityMembershipStatistics } from "./ICommunityPlatformCommunityMembershipStatistics";

export namespace IPageICommunityPlatformCommunityMembershipStatistics {
  /**
   * Paginated response wrapper for per‑community membership statistics.
   *
   * This DTO is used by analytical endpoints such as
   * `/communityPlatform/statistics/communities/membership` to return a slice
   * of computed membership metrics across many communities. It groups generic
   * pagination information with a list of
   * `ICommunityPlatformCommunityMembershipStatistics.ISummary` records so
   * that front‑end experiences—such as dashboards and reporting views—can
   * efficiently browse, sort, and filter membership statistics without
   * loading the entire dataset at once.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current window of community
     * membership statistics.
     *
     * The `IPage.IPagination` structure exposes information such as the
     * current page index, the per‑page limit, the total number of
     * communities that matched the supplied filters, and the derived page
     * count. Analytical dashboards and reporting UIs use these values to
     * paginate through large sets of communities, drive table paging
     * controls, and construct additional requests when users navigate to
     * subsequent pages of statistics.
     */
    pagination: IPage.IPagination;

    /**
     * List of per‑community membership statistics summaries for the current
     * page.
     *
     * Each entry is an
     * `ICommunityPlatformCommunityMembershipStatistics.ISummary` DTO that
     * aggregates key metrics (for example total active members and recent
     * joins) for a single community. These summaries are computed from the
     * `community_platform_community_memberships` table in combination with
     * related community metadata, and are designed to power admin and
     * moderator dashboards, overview tables, and drill‑down links into more
     * detailed community analytics.
     */
    data: ICommunityPlatformCommunityMembershipStatistics.ISummary[];
  };
}
