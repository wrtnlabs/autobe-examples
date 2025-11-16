import { IPage } from "./IPage";
import { IShoppingMallShipment } from "./IShoppingMallShipment";

export namespace IPageIShoppingMallShipment {
  /**
   * Paginated collection of shipment summary records associated with an order
   * or shipment search query.
   *
   * This wrapper is used as the response body for operations such as `PATCH
   * /shoppingMall/orders/{orderId}/shipments`, where callers request a
   * pageable list of shipments created for a specific customer order. The
   * `pagination` object describes how the result set is sliced, and the
   * `data` array contains shipment summaries for the current page.
   *
   * The shipments listed here are projections of rows from the
   * `shopping_mall_shipments` table, exposed through
   * `IShoppingMallShipment.ISummary`. By returning a strongly-typed page
   * structure, the API enables clients to build consistent paging controls
   * and list screens while keeping shipment detail endpoints separate for
   * more heavyweight inspection scenarios.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Provides the standard pagination metadata for shipment listing
     * operations, including which page is being returned, how many records
     * are included per page, and how many matching shipment records exist
     * in total. This structure is shared across multiple paginated APIs in
     * the shopping mall platform.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * Each element in this array is a `IShoppingMallShipment.ISummary` DTO
     * representing a single shipment derived from the
     * `shopping_mall_shipments` Prisma model. The summary exposes
     * high-level shipment details such as identifier, carrier, tracking
     * number, status, and aggregate item counts that are appropriate for
     * list and dashboard views.
     */
    data: IShoppingMallShipment.ISummary[];
  };
}
