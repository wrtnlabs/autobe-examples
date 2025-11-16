import { IPage } from "./IPage";
import { IShoppingMallOrderStatusEvent } from "./IShoppingMallOrderStatusEvent";

export namespace IPageIShoppingMallOrderStatusEvent {
  /**
   * Paginated collection of order status history events for a single
   * customer-facing order.
   *
   * This schema serves as the response body for the PATCH
   * `/shoppingMall/customer/orders/{orderId}/statusEvents` operation. It
   * wraps a page of `IShoppingMallOrderStatusEvent.ISummary` entries derived
   * from the `shopping_mall_order_status_events` Prisma table, each
   * representing a discrete transition in the lifecycle of an order stored in
   * `shopping_mall_orders`.
   *
   * In typical usage, clients such as customer portals, seller dashboards,
   * and administrative consoles use this type to build order timelines or
   * audit trails. The `data` array contains business-relevant details for
   * each status event, while the `pagination` field (based on
   * `IPage.IPagination`) provides the metadata needed to scroll through
   * extensive histories efficiently, respecting the filter and sorting
   * criteria defined by `IShoppingMallOrderStatusEvent.IRequest` and the
   * `orderId` path parameter.
   */
  export type ISummary = {
    /**
     * Page information describing the current slice of order status events.
     *
     * Includes the current page index, page size, total event count, and
     * total pages, enabling clients to navigate long status histories
     * without retrieving all events at once.
     */
    pagination: IPage.IPagination;

    /**
     * List of order status event summaries for the current page.
     *
     * Each entry is an `IShoppingMallOrderStatusEvent.ISummary` projection
     * of a record from the `shopping_mall_order_status_events` Prisma
     * model, constrained to the order identified by the `orderId` path
     * parameter of the associated endpoint. Events typically include
     * timestamps, previous and new statuses, actor type, and optional
     * reason information, allowing consumers to reconstruct the lifecycle
     * of the order over time.
     */
    data: IShoppingMallOrderStatusEvent.ISummary[];
  };
}
