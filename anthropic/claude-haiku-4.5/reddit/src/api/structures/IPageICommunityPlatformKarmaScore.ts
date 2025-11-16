import { IPage } from "./IPage";
import { ICommunityPlatformKarmaScore } from "./ICommunityPlatformKarmaScore";

export namespace IPageICommunityPlatformKarmaScore {
  /**
   * Paginated response containing karma score summary records with navigation
   * metadata.
   *
   * This page type wraps karma score data with pagination information for
   * efficient retrieval of member reputation metrics. Each page contains
   * karma summaries for multiple members along with pagination controls for
   * browsing through all results.
   *
   * The response structure enables administrators and moderators to
   * efficiently analyze member reputation distribution, identify
   * high-reputation members, and monitor karma trends across the platform
   * without exposing sensitive member information.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating karma score results. Contains the
     * current page number (1-indexed), the limit of records per page, total
     * count of all karma scores in the database, and calculated total
     * number of pages. Enables efficient client-side pagination controls
     * and result navigation.
     */
    pagination: IPage.IPagination;

    /**
     * Array of karma score summary records matching the search criteria.
     * Each item contains a member's current karma reputation metrics:
     * total_karma (combined reputation), post_karma (votes on posts),
     * comment_karma (votes on comments), and updated_at timestamp
     * indicating when karma was last recalculated. Represents a lightweight
     * view optimized for list display and analysis.
     */
    data: ICommunityPlatformKarmaScore.ISummary[];
  };
}
