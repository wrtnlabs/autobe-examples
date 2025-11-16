import { IPage } from "./IPage";
import { IShoppingMallOrder } from "./IShoppingMallOrder";

export namespace IPageIShoppingMallOrder {
  /**
   * Paginated collection of order summary records derived from the
   * `shopping_mall_orders` table.
   *
   * This schema acts as a generic page envelope that combines pagination
   * metadata with an array of `IShoppingMallOrder.ISummary` items. Each
   * element in `data` represents a single customer-facing master order,
   * projected into a lightweight summary that exposes identifiers, key
   * timestamps, lifecycle statuses, and high-level monetary totals. The
   * underlying order data comes from the `shopping_mall_orders` Prisma model,
   * which stores immutable checkout snapshots and mutable lifecycle fields
   * such as `order_status` and `payment_status`.
   *
   * The page wrapper is used by search and listing endpoints like `PATCH
   * /shoppingMall/platformAdmin/orders`, `PATCH
   * /shoppingMall/customer/orders/search`, and related search operations that
   * accept an `IShoppingMallOrder.IRequest` body. The `pagination` field
   * reflects the requested page, page size, overall result count, and page
   * count, enabling list UIs and dashboards to implement navigation, result
   * counters, and infinite scrolling. The `data` array contains only the
   * subset of orders that match the current filter criteria, making this
   * envelope reusable across both customer and administrator views while
   * keeping the response payload efficient for list-oriented use cases.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrder.ISummary[];
  };
}
