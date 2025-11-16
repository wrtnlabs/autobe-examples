import { IPage } from "./IPage";
import { ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers } from "./ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers";

export namespace IPageICommunityPlatformVotingKarmaStatisticsTopKarmaUsers {
  /**
   * Paginated result set for top‑karma user statistics derived from
   * `community_platform_user_total_karmas` and related aggregation tables.
   *
   * This wrapper combines generic pagination metadata from
   * `IPage.IPagination` with a page of
   * `ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary` rows. It
   * is returned by analytics endpoints such as
   * `/communityPlatform/votingKarma/statistics/topKarmaUsers`, allowing
   * dashboards and leaderboard UIs to page through ranked users while
   * preserving consistent pagination semantics across the community
   * platform.
   */
  export type ISummary = {
    /**
     * Pagination metadata that describes the current slice of the ranked
     * top‑karma user list.
     *
     * This object exposes the current page index, page size, total record
     * count, and total number of pages so that clients can render paging
     * controls and navigate through the full leaderboard. It is shared
     * across all paginated responses in the community platform and is not
     * specific to karma statistics.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of top‑karma user summary rows for the current
     * page.
     *
     * Each element is an
     * `ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary` entry
     * representing a single member user that appears in the ranking,
     * including their identity summary, aggregated karma metrics (total,
     * post, and comment karma), and their 1‑based rank within the selected
     * analysis window and filter scope.
     */
    data: ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers.ISummary[];
  };
}
