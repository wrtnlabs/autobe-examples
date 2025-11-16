import { IPage } from "./IPage";
import { IShoppingMallOrderSeller } from "./IShoppingMallOrderSeller";

export namespace IPageIShoppingMallOrderSeller {
  /**
   * Paginated response containing a list of order seller segment summaries.
   *
   * This wrapper type encapsulates both the seller segment data and
   * pagination metadata for retrieving seller portions within a multi-seller
   * order. It enables efficient navigation when an order contains items from
   * many different sellers.
   *
   * Used as the response type for seller segment search operations within a
   * specific parent order. The pagination information allows clients to
   * implement paging controls when displaying how an order is distributed
   * across multiple sellers.
   *
   * The structure follows the standard IPage pattern used throughout the API
   * for consistent pagination behavior across all list endpoints.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the seller segment list.
     *
     * Provides information about the current page position, total seller
     * segments, and navigation details for browsing through all seller
     * portions of an order.
     */
    pagination: IPage.IPagination;

    /**
     * Array of seller segment summary records for the current page.
     *
     * Contains the seller sub-order records matching the search criteria,
     * limited to the current page size. Each item provides essential seller
     * portion information including fulfillment status and financial
     * breakdowns.
     */
    data: IShoppingMallOrderSeller.ISummary[];
  };
}
