import { IPage } from "./IPage";
import { IShoppingMallReviewReport } from "./IShoppingMallReviewReport";

export namespace IPageIShoppingMallReviewReport {
  /**
   * Paginated response wrapper for review report summaries.
   *
   * Encapsulates a page of review report records along with pagination
   * metadata, enabling efficient navigation through large collections of
   * user-submitted reports flagging reviews for policy violations. This
   * structure follows the standard IPage pattern used throughout the API for
   * consistent pagination behavior.
   *
   * Used as the response type for search and filter operations on review
   * reports, particularly in administrative moderation workflows where
   * moderators need to process multiple reports efficiently. The pagination
   * wrapper allows clients to request specific page ranges and provides all
   * necessary information to build pagination controls.
   *
   * This wrapper type combines the IPage.IPagination metadata (current page,
   * total pages, record counts) with an array of
   * IShoppingMallReviewReport.ISummary entities representing the actual
   * report data for the current page. The separation of pagination metadata
   * from content data enables flexible client-side rendering and progressive
   * loading strategies.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through review report results.
     *
     * Provides essential information for client-side pagination controls
     * including current page number, total number of pages, records per
     * page limit, and total record count. Enables users to navigate forward
     * and backward through the complete set of review reports matching the
     * search criteria.
     *
     * This metadata is critical for administrative moderation interfaces
     * where large volumes of reports need to be processed efficiently
     * without overwhelming the UI or network with excessive data transfer.
     */
    pagination: IPage.IPagination;

    /**
     * Array of review report summary records for the current page.
     *
     * Contains the actual review report data matching the search filters
     * and pagination parameters. Each element is a lightweight summary
     * representation optimized for list views in moderation queues and
     * administrative dashboards.
     *
     * The array length will not exceed the limit specified in the
     * pagination metadata, and may be shorter on the final page of results.
     * Empty array indicates no reports match the current filter criteria or
     * the requested page is beyond the available data range.
     */
    data: IShoppingMallReviewReport.ISummary[];
  };
}
