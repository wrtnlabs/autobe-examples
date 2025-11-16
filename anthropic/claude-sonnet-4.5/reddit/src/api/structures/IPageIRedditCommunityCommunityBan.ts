import { IPage } from "./IPage";
import { IRedditCommunityCommunityBan } from "./IRedditCommunityCommunityBan";

export namespace IPageIRedditCommunityCommunityBan {
  /**
   * Paginated response containing community ban summaries with navigation
   * metadata.
   *
   * This schema represents a single page of ban records returned by moderator
   * ban search and management operations. It combines the actual ban data
   * array with pagination information to enable efficient browsing of
   * potentially large ban histories across communities.
   *
   * Used by operations that retrieve filtered lists of community bans,
   * including global ban searches, community-specific ban lists, and
   * member-specific ban history queries. The pagination wrapper allows
   * clients to navigate through ban results without loading the entire
   * dataset, improving performance and user experience for moderation
   * interfaces.
   *
   * The data array contains IRedditCommunityCommunityBan.ISummary records
   * providing lightweight ban information optimized for list displays and
   * moderation queue management. The pagination object provides the metadata
   * needed for constructing page navigation controls and calculating result
   * offsets.
   *
   * This response type integrates with the reddit_community_community_bans
   * table from the Prisma schema, presenting search results in a standardized
   * paginated format used consistently across the platform's moderation
   * tools.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through the ban result set.
     *
     * Provides essential information including current page number, items
     * per page limit, total record count, and total pages available. Used
     * by clients to construct pagination controls and navigate between
     * pages of ban data.
     *
     * Enables efficient browsing of large ban histories without loading all
     * records at once.
     */
    pagination: IPage.IPagination;

    /**
     * Array of community ban summary records for the current page.
     *
     * Contains the actual ban data matching the search criteria and
     * pagination parameters. Each element provides essential ban
     * information including reason, duration type, expiration, banned
     * member, community, and issuing moderator.
     *
     * Array size is controlled by the pagination limit parameter and may be
     * smaller on the last page.
     */
    data: IRedditCommunityCommunityBan.ISummary[];
  };
}
