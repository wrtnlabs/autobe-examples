import { IPage } from "./IPage";
import { IRedditCommunityCommunityModerator } from "./IRedditCommunityCommunityModerator";

export namespace IPageIRedditCommunityCommunityModerator {
  /**
   * Paginated response wrapper for community moderator listing operations.
   *
   * This schema represents a standard pagination envelope that combines
   * result metadata with actual moderator assignment data, enabling efficient
   * navigation through moderator lists for communities with large moderation
   * teams. The structure separates pagination control information from the
   * actual data payload, following the standard IPage<T> pattern used
   * consistently across the platform.
   *
   * Used as the response type for community moderator list endpoints that
   * support pagination and filtering. The pagination metadata allows clients
   * to implement user interface controls for navigating through moderator
   * lists, displaying total moderator counts for transparency, and
   * understanding the current position within the complete moderator team
   * roster. The data array contains the actual moderator-community
   * relationship records for the current page, each in summary format
   * optimized for moderator list displays.
   *
   * This pagination pattern ensures consistent API behavior across all list
   * operations, provides predictable response structures for client
   * applications implementing community governance interfaces, and enables
   * efficient data transfer by limiting result sizes while maintaining full
   * navigability of complete moderator lists. Clients can use the pagination
   * information to implement scrollable moderator lists, page-based
   * navigation, or other pagination UI patterns for community management and
   * transparency features.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the moderator listing.
     *
     * Provides essential information about the current page position, total
     * available moderator records, and navigation context within the
     * complete set of moderators for the specified community.
     *
     * Includes current page number, page size limit, total moderator count
     * across all pages, and calculated total page count. This metadata
     * enables clients to implement pagination controls, display moderator
     * team size statistics, and navigate through moderator lists for
     * communities with large moderation teams.
     */
    pagination: IPage.IPagination;

    /**
     * Array of community-moderator relationship records for the current
     * page.
     *
     * Contains the actual moderator assignment data for the specified
     * community, limited to the page size specified in the pagination
     * metadata. Each element represents a moderator's association with the
     * community, including appointment details and references to both the
     * moderator and community entities.
     *
     * The number of items in this array corresponds to the pagination limit
     * (or fewer for the last page), and represents a slice of the total
     * moderator assignments indicated in the pagination metadata.
     */
    data: IRedditCommunityCommunityModerator.ISummary[];
  };
}
