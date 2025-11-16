import { IPage } from "./IPage";
import { IShoppingMallOrderReturnRequest } from "./IShoppingMallOrderReturnRequest";

export namespace IPageIShoppingMallOrderReturnRequest {
  /**
   * Paginated collection of order return or refund request summaries scoped
   * to a single customer-facing master order.
   *
   * This schema is used as the response envelope for return request search
   * endpoints such as
   * `/shoppingMall/customer/orders/{orderId}/returnRequests`,
   * `/shoppingMall/seller/orders/{orderId}/returnRequests`, and
   * `/shoppingMall/platformAdmin/orders/{orderId}/returnRequests`. It
   * represents a window over the `shopping_mall_order_return_requests` Prisma
   * model, constrained by the order identified in the path and any filters
   * provided via `IShoppingMallOrderReturnRequest.IRequest`.
   *
   * The `pagination` field follows the shared `IPage.IPagination` contract,
   * exposing the current page index, page size, total matched return
   * requests, and total page count so that clients can implement robust
   * paginated UIs. The `data` array contains zero or more
   * `IShoppingMallOrderReturnRequest.ISummary` items, each summarizing a
   * return or refund request with fields such as the associated order
   * summary, request status, categorized reason, and creation timestamp. This
   * design enables customers, sellers, and administrators to efficiently
   * review after-sales activity without incurring the cost of loading full
   * detail for every request in the result set.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Includes standard pagination metrics such as the current page number,
     * per-page limit, total number of return requests matching the query,
     * and the computed total page count. These values are calculated from
     * queries over the `shopping_mall_order_return_requests` table for the
     * specified order.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * Each array element is an `IShoppingMallOrderReturnRequest.ISummary`
     * object that provides a lightweight view of a single return or refund
     * request belonging to the target order. The list may be empty if no
     * return requests satisfy the filtering and pagination criteria
     * supplied in the corresponding request DTO.
     */
    data: IShoppingMallOrderReturnRequest.ISummary[];
  };
}
