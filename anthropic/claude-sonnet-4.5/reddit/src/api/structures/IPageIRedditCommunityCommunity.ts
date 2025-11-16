import { IPage } from "./IPage";
import { IRedditCommunityCommunity } from "./IRedditCommunityCommunity";

export namespace IPageIRedditCommunityCommunity {
  /**
   * Paginated response wrapper for community listing operations.
   *
   * This schema represents a standard pagination envelope that combines
   * result metadata with actual community data, enabling efficient navigation
   * through large result sets in community discovery and search operations.
   * The structure separates pagination control information from the actual
   * data payload, following the standard IPage<T> pattern used throughout the
   * platform.
   *
   * Used as the response type for community search and listing endpoints that
   * support pagination. The pagination metadata allows clients to implement
   * user interface controls for navigating between pages, displaying result
   * counts, and understanding the user's position within the complete result
   * set. The data array contains the actual community records for the current
   * page, each in summary format optimized for list displays.
   *
   * This pagination pattern ensures consistent API behavior across all list
   * operations, provides predictable response structures for client
   * applications, and enables efficient data transfer by limiting result
   * sizes while maintaining full navigability of large datasets. Clients can
   * use the pagination information to implement infinite scroll, traditional
   * page-based navigation, or other pagination UI patterns.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the community listing.
     *
     * Provides essential information about the current page position, total
     * available records, and navigation context within the complete set of
     * communities matching the search criteria.
     *
     * Includes current page number, page size limit, total record count
     * across all pages, and calculated total page count. This metadata
     * enables clients to implement pagination controls, display result
     * statistics, and navigate through large community result sets
     * efficiently.
     */
    pagination: IPage.IPagination;

    /**
     * Array of community summary records for the current page.
     *
     * Contains the actual community data matching the search and filter
     * criteria, limited to the page size specified in the pagination
     * metadata. Each element provides essential community identification
     * and display information optimized for list views and discovery
     * interfaces.
     *
     * The number of items in this array corresponds to the pagination limit
     * (or fewer for the last page), and represents a slice of the total
     * records indicated in the pagination metadata.
     */
    data: IRedditCommunityCommunity.ISummary[];
  };
}
