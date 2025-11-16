import { IPage } from "./IPage";
import { IShoppingMallFulfillment } from "./IShoppingMallFulfillment";

export namespace IPageIShoppingMallFulfillment {
  /**
   * Paginated collection of fulfillment summary records associated with a
   * single customer order.
   *
   * This schema wraps a list of `IShoppingMallFulfillment.ISummary` objects
   * together with pagination metadata from `IPage.IPagination`. It is used as
   * the response type for the `PATCH
   * /shoppingMall/orders/{orderId}/fulfillments` operation, which reads from
   * the `shopping_mall_fulfillments` Prisma model constrained by a parent
   * `shopping_mall_orders` record.
   *
   * In the shopping mall domain, each fulfillment aggregate describes how far
   * one or more order lines have progressed through picking, packing,
   * shipping, and delivery. This page wrapper allows clients to list those
   * fulfillment aggregates in manageable chunks instead of loading every
   * record at once.
   *
   * Client applications typically:
   *
   * - Use `pagination` to render paging controls and determine whether
   *   additional fulfillment pages are available.
   * - Iterate through `data` to show fulfillment rows with identifiers, seller
   *   context, current fulfillment status, and key timestamps.
   * - Combine this list with detail endpoints (for example, a `GET
   *   /orders/{orderId}/fulfillments/{fulfillmentId}` style operation) when
   *   deeper per-fulfillment information is required.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Provides the current page number, page size, total number of
     * fulfillment aggregates, and total page count for the fulfillment
     * listing query.
     */
    pagination: IPage.IPagination;

    /**
     * List of fulfillment summary records for the current page.
     *
     * Each element is an `IShoppingMallFulfillment.ISummary` DTO that
     * summarises the physical processing state of one or more order lines
     * belonging to the scoped order.
     */
    data: IShoppingMallFulfillment.ISummary[];
  };
}
