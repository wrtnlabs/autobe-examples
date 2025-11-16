import { IPage } from "./IPage";
import { IShoppingMallReviewModerationLog } from "./IShoppingMallReviewModerationLog";

export namespace IPageIShoppingMallReviewModerationLog {
  /**
   * Paginated response wrapper for review moderation log summaries.
   *
   * Encapsulates a page of moderation log records along with pagination
   * metadata, enabling efficient navigation through comprehensive audit
   * trails of administrative actions taken on product reviews. This structure
   * follows the standard IPage pattern used throughout the API for consistent
   * pagination behavior.
   *
   * Used as the response type for moderation history queries, particularly in
   * administrative compliance and quality assurance workflows where complete
   * visibility into moderation decisions is required. The pagination wrapper
   * allows administrators to navigate through potentially extensive audit
   * histories while maintaining reasonable response sizes and performance.
   *
   * This wrapper type combines the IPage.IPagination metadata (current page,
   * total pages, record counts) with an array of
   * IShoppingMallReviewModerationLog.ISummary entities representing the
   * actual moderation action history for the current page. The separation of
   * pagination metadata from audit content enables flexible rendering of
   * moderation timelines and progressive loading of historical records.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through moderation log audit
     * trail.
     *
     * Provides essential information for client-side pagination controls
     * including current page number, total number of pages, records per
     * page limit, and total record count. Enables administrators to
     * navigate through the complete audit history of moderation actions
     * taken on a specific review.
     *
     * This metadata is critical for administrative audit interfaces where
     * comprehensive review of moderation history is required for
     * compliance, quality assurance, and investigation purposes without
     * overwhelming the interface with excessive historical data.
     */
    pagination: IPage.IPagination;

    /**
     * Array of moderation log summary records for the current page.
     *
     * Contains the actual moderation action history matching the search
     * filters and pagination parameters. Each element is a lightweight
     * summary representation optimized for audit trail displays and
     * administrative dashboards showing who performed which actions when.
     *
     * The array length will not exceed the limit specified in the
     * pagination metadata, and may be shorter on the final page of results.
     * Empty array indicates no moderation actions match the current filter
     * criteria or the requested page is beyond the available audit history
     * range.
     */
    data: IShoppingMallReviewModerationLog.ISummary[];
  };
}
