import { IPage } from "./IPage";
import { IShoppingMallOrderLine } from "./IShoppingMallOrderLine";

export namespace IPageIShoppingMallOrderLine {
  /**
   * Paginated collection of order line summaries belonging to a single
   * customer-facing order.
   *
   * This schema is used as the response body for the PATCH
   * `/shoppingMall/*\\/orders/{orderId}/lines` operations, where `orderId`
   * identifies a specific master order stored in the `shopping_mall_orders`
   * table. The `data` array contains `IShoppingMallOrderLine.ISummary`
   * objects that represent individual line items from the
   * `shopping_mall_order_lines` Prisma model, such as products, SKUs,
   * quantities, monetary snapshots, and the current line status.
   *
   * From a business perspective, this type underpins order item list views
   * for customers, sellers, and platform administrators. Customers use it to
   * review what they purchased in a given order, sellers use it to inspect
   * lines they must fulfill, and administrators use it for audit and support
   * tooling. The `pagination` field, which follows `IPage.IPagination`,
   * provides the metadata required to page through larger result sets without
   * loading all line items at once.
   */
  export type ISummary = {
    /**
     * Page information for the current slice of order lines.
     *
     * This object exposes the 1-based current page index, requested page
     * size, total record count, and total page count so that clients can
     * implement robust paging controls while browsing order lines for a
     * specific order.
     */
    pagination: IPage.IPagination;

    /**
     * List of order line summary records for the current page.
     *
     * Each element is an `IShoppingMallOrderLine.ISummary` derived from the
     * `shopping_mall_order_lines` Prisma model and scoped to a single
     * parent order in `shopping_mall_orders`. The collection reflects the
     * result of applying any search, filter, and sort criteria sent via
     * `IShoppingMallOrderLine.IRequest` in combination with the `orderId`
     * path parameter.
     */
    data: IShoppingMallOrderLine.ISummary[];
  };
}
