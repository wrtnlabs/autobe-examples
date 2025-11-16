import { IPage } from "./IPage";
import { IShoppingMallOrder } from "./IShoppingMallOrder";

export namespace IPageIShoppingMallOrder {
  /**
   * Paginated response containing a list of order summaries.
   *
   * This wrapper type encapsulates both the order data and pagination
   * metadata for list retrieval operations. It enables efficient navigation
   * through large order datasets by dividing results into manageable pages.
   *
   * Used as the response type for order search and list operations across
   * buyer, seller, and admin contexts. The pagination information allows
   * clients to implement paging controls and display total record counts.
   *
   * The structure follows the standard IPage pattern used throughout the API
   * for consistent pagination behavior across all list endpoints.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the order list.
     *
     * Provides information about the current page position, total records,
     * and navigation details for browsing through the complete order
     * dataset.
     */
    pagination: IPage.IPagination;

    /**
     * Array of order summary records for the current page.
     *
     * Contains the order records matching the search criteria and filters,
     * limited to the current page size. Each item provides essential order
     * information optimized for list displays.
     */
    data: IShoppingMallOrder.ISummary[];
  };
}
