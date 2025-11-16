import { IPage } from "./IPage";
import { IRedditCommunityCommunityRule } from "./IRedditCommunityCommunityRule";

export namespace IPageIRedditCommunityCommunityRule {
  /**
   * Paginated response container for community rule summary listings.
   *
   * This response type wraps collections of community rule summaries with
   * pagination metadata, enabling efficient retrieval and navigation of
   * potentially large rule sets. Used primarily in rule browsing, search, and
   * filtering operations where communities may have numerous guidelines that
   * need to be presented across multiple pages.
   *
   * The structure separates pagination control information from actual rule
   * data, allowing clients to implement sophisticated pagination UIs while
   * maintaining clean separation of concerns. Pagination metadata provides
   * everything needed to render page controls, while the data array contains
   * the actual rule content for display.
   *
   * Typically returned by operations that list or search community rules,
   * such as retrieving all rules for a specific community with filtering and
   * sorting capabilities. The pagination wrapper ensures consistent response
   * structure across all rule listing endpoints and supports scalable data
   * presentation for communities with extensive rule systems.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through the complete set of
     * community rules.
     *
     * Provides essential information for implementing client-side
     * pagination controls, including current page number, total available
     * pages, records per page limit, and total record count. This metadata
     * enables users to navigate forward and backward through rule listings
     * and understand their position within the complete result set.
     *
     * Used by frontend applications to render pagination controls,
     * calculate page ranges, and optimize data fetching strategies for
     * large community rule collections.
     */
    pagination: IPage.IPagination;

    /**
     * Array of community rule summaries for the current page.
     *
     * Contains the actual rule data matching the search and filter criteria
     * specified in the request. Each element provides essential rule
     * information optimized for list displays, including rule title,
     * identifier, display order, and community association.
     *
     * The array size is controlled by pagination parameters and may contain
     * fewer items than the requested limit on the final page. Empty arrays
     * indicate no rules match the specified criteria or the requested page
     * exceeds available data.
     */
    data: IRedditCommunityCommunityRule.ISummary[];
  };
}
