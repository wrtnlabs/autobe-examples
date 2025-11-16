import { IPage } from "./IPage";
import { IShoppingMallFulfillmentItem } from "./IShoppingMallFulfillmentItem";

export namespace IPageIShoppingMallFulfillmentItem {
  /**
   * Paginated collection of fulfillment item summaries for a specific query.
   *
   * This wrapper is used as the response type for operations such as `PATCH
   * /shoppingMall/customer/fulfillments/{fulfillmentId}/items`, where the
   * backend returns fulfillment items belonging to a single parent
   * fulfillment as a pageable list. The `pagination` field describes the
   * current slice of the result set, while `data` contains the actual
   * fulfillment item summaries.
   *
   * Although the page container itself is generic, the `data` items are
   * projections of rows from the `shopping_mall_fulfillment_items` table,
   * exposed through `IShoppingMallFulfillmentItem.ISummary`. This design
   * allows client applications to inspect how fulfillment work has been
   * broken down into individual items without having to handle low-level
   * pagination and counting logic themselves.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Encapsulates the current page index, page size limit, total record
     * count, and total page count for the fulfillment item query. The
     * structure is shared across all paginated endpoints in the shopping
     * mall backend so that UIs can implement a consistent paging
     * experience.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * Each element is a `IShoppingMallFulfillmentItem.ISummary` DTO
     * representing a single fulfillment item row derived from the
     * `shopping_mall_fulfillment_items` Prisma model. The summary focuses
     * on the most relevant business fields for list views, such as
     * quantities and operational status, and may include denormalized
     * information from related order and shipment entities.
     */
    data: IShoppingMallFulfillmentItem.ISummary[];
  };
}
