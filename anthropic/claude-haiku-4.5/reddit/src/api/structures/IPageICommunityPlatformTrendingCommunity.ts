import { IPage } from "./IPage";
import { ICommunityPlatformTrendingCommunity } from "./ICommunityPlatformTrendingCommunity";

export namespace IPageICommunityPlatformTrendingCommunity {
  /**
   * Paginated collection of trending communities for discovery.
   *
   * Response container for the trending communities endpoint, providing users
   * with a curated list of communities currently gaining subscriber growth
   * momentum and engagement on the platform. Uses standard pagination pattern
   * with separate pagination metadata and data array for clean separation of
   * concerns.
   *
   * The response structure supports efficient browsing of emerging and
   * popular communities through pagination, allowing users to navigate
   * through pages of trending communities. Each community includes essential
   * metadata: subscriber count, post/comment activity metrics, trend
   * indicators (rank, velocity, category), and creator context for
   * attribution.
   *
   * Trending communities are ranked by multiple algorithms (hot for growth
   * velocity + recency, new for chronological, top for all-time subscriber
   * counts, controversial for polarized engagement) to provide different
   * discovery perspectives. The trending data is pre-calculated from the
   * community_platform_trending_content materialized view, refreshed hourly,
   * enabling response times under 500ms even with millions of communities.
   *
   * Only public communities appear in trending results (visibility='public').
   * Deleted communities are excluded (deleted_at is null requirement).
   * Unauthenticated guests can access trending communities for discovery.
   * Authenticated members see personalized recommendations ranking
   * communities they are NOT yet subscribed to higher, promoting discovery of
   * new communities aligned with their interests.
   *
   * Typical user flow: Users browse trending communities via this endpoint to
   * discover emerging or popular communities, then call GET
   * /communities/{communityId} for detailed information before deciding to
   * subscribe.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Contains pagination metadata for navigating through trending
     * community results.
     */
    pagination: IPage.IPagination;

    /**
     * List of trending communities.
     *
     * Array of trending community summary entries from the materialized
     * view, each containing community metadata, subscriber metrics, and
     * trend indicators. The array is sorted by trend score (rank) within
     * the specified trending category.
     */
    data: ICommunityPlatformTrendingCommunity.ISummary[];
  };
}
