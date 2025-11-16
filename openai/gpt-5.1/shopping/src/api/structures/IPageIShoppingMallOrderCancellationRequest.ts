import { IPage } from "./IPage";
import { IShoppingMallOrderCancellationRequest } from "./IShoppingMallOrderCancellationRequest";

export namespace IPageIShoppingMallOrderCancellationRequest {
  /**
   * Paginated collection of order cancellation request summaries associated
   * with a specific customer-facing order.
   *
   * This wrapper type is used as the response body for list/search endpoints
   * that query the `shopping_mall_order_cancellation_requests` Prisma model
   * within the scope of a single master order (for example,
   * `/shoppingMall/platformAdmin/orders/{orderId}/cancellationRequests`). It
   * combines standard pagination metadata with a slice of cancellation
   * request summaries optimized for list and dashboard views.
   *
   * The `pagination` property exposes page-level metadata via
   * `IPage.IPagination`, including the current page, page size, total matched
   * records, and total pages for the current filter set. The `data` array
   * contains zero or more `IShoppingMallOrderCancellationRequest.ISummary`
   * objects, each representing a single cancellation request with key fields
   * such as status, reason, and creation timestamp. This structure allows
   * platform administrators to efficiently browse, filter, and sort
   * cancellation activity for a given order without loading full detail
   * payloads for every request.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Contains numeric pagination metadata such as the current page index,
     * page size limit, total record count, and total page count. These
     * values are derived from the underlying query against
     * `shopping_mall_order_cancellation_requests` for the specified order
     * context.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * Each element is a summary view of a single order cancellation request
     * (`IShoppingMallOrderCancellationRequest.ISummary`) associated with
     * the order identified by the surrounding API path parameter. The array
     * may be empty when no cancellation requests match the applied search
     * criteria.
     */
    data: IShoppingMallOrderCancellationRequest.ISummary[];
  };
}
