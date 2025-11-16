import { IPage } from "./IPage";
import { IShoppingMallOrderAddress } from "./IShoppingMallOrderAddress";

export namespace IPageIShoppingMallOrderAddress {
  /**
   * Paginated collection of order address snapshot summaries for a specific
   * order in the shoppingMall platform.
   *
   * This page wrapper is used as the response body of the
   * `/shoppingMall/platformAdmin/orders/{orderId}/addresses` endpoint. It
   * combines generic pagination metadata in `pagination` with a `data` array
   * of `IShoppingMallOrderAddress.ISummary` DTOs, each representing a
   * denormalized shipping or billing address captured from
   * `shopping_mall_order_addresses`. Administrative UIs and reporting tools
   * rely on this schema to browse, audit, and export address information
   * associated with a single order using standard paging patterns.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the administrative search over order address
     * snapshots.
     *
     * This `IPage.IPagination` structure describes the current page index,
     * page size, total count of matching address snapshot records, and
     * total number of pages for the query executed by
     * `/shoppingMall/platformAdmin/orders/{orderId}/addresses`. It is
     * always returned so that admin tools can implement stable paging,
     * exporting, and progress indicators, regardless of how many address
     * records match the filters.
     */
    pagination: IPage.IPagination;

    /**
     * List of order address snapshot summaries included in the current page
     * of results.
     *
     * Each element is an `IShoppingMallOrderAddress.ISummary`
     * representation of a row from the `shopping_mall_order_addresses`
     * Prisma model, scoped to the specified order. These summaries provide
     * enough information for administrators to review destinations, perform
     * audits, and investigate address-related issues without loading full
     * address entities in bulk.
     *
     * The array can be empty when the filter criteria yield no matching
     * address snapshots for the given order, but the property itself is
     * always present so that clients can rely on a consistent data
     * structure.
     */
    data: IShoppingMallOrderAddress.ISummary[];
  };
}
