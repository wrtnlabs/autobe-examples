import { IPage } from "./IPage";
import { IShoppingMallOrderItem } from "./IShoppingMallOrderItem";

export namespace IPageIShoppingMallOrderItem {
  /**
   * Paginated response containing order item summary records for a specific
   * order.
   *
   * This wrapper type encapsulates search results for order items within an
   * order, providing both the data records and pagination metadata needed for
   * list displays and navigation. Used as the response type for order item
   * search operations where buyers, sellers, or administrators need to view
   * and filter items within a specific order.
   *
   * The pagination structure enables efficient handling of orders containing
   * many items by breaking results into manageable pages. This is
   * particularly important for bulk orders or marketplace orders with items
   * from multiple sellers where the item count can be substantial.
   *
   * Typical use cases include order detail pages showing all purchased items,
   * seller dashboards displaying items they need to fulfill, and admin
   * interfaces for order management and dispute resolution. The search
   * capabilities integrated with this paginated response allow filtering by
   * product name, SKU, price ranges, and seller to quickly locate specific
   * items within large orders.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the order items result set.
     *
     * Provides essential information about the current page position, total
     * records, and navigation capabilities. Includes current page number,
     * page size limit, total record count, and total page count for
     * implementing pagination controls in order detail interfaces.
     */
    pagination: IPage.IPagination;

    /**
     * Array of order item summary records matching the search criteria.
     *
     * Contains the actual order item data for the current page, with each
     * element representing one line item from the order. Includes essential
     * product information, pricing, quantity, and fulfillment status for
     * display in order detail views and seller dashboards.
     */
    data: IShoppingMallOrderItem.ISummary[];
  };
}
