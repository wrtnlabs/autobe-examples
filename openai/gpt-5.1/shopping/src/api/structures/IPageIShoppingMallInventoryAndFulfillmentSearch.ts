import { IPage } from "./IPage";
import { IShoppingMallInventoryAndFulfillmentSearch } from "./IShoppingMallInventoryAndFulfillmentSearch";

export namespace IPageIShoppingMallInventoryAndFulfillmentSearch {
  /**
   * Paginated collection of inventory and fulfillment search summary records
   * for platform administrators.
   *
   * This schema represents the response body for operations such as `PATCH
   * /shoppingMall/platformAdmin/search/inventoryAndFulfillment`, where the
   * backend executes a complex search over `shopping_mall_inventory_items`,
   * `shopping_mall_fulfillments`, `shopping_mall_product_skus`,
   * `shopping_mall_products`, `shopping_mall_orders`, and
   * `shopping_mall_shipments`.
   *
   * The `pagination` property carries page‑level metadata, and the `data`
   * array contains `IShoppingMallInventoryAndFulfillmentSearch.ISummary` rows
   * that summarize inventory state, reservations, and fulfillment or shipment
   * context for individual SKUs. It is optimized for list and dashboard
   * views, and is read‑only from the client perspective.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current inventory and fulfillment search
     * results.
     *
     * This property follows the shared `IPage.IPagination` schema and
     * conveys the 0‑based or 1‑based page index (depending on backend
     * conventions), page size limit, total number of matching records, and
     * total number of pages for the query executed against inventory and
     * fulfillment data.
     *
     * Clients use this information together with the filters in
     * `IShoppingMallInventoryAndFulfillmentSearch.IRequest` to implement
     * paging controls, jump to specific pages, and detect when they have
     * reached the end of the result set.
     */
    pagination: IPage.IPagination;

    /**
     * Current page of inventory and fulfillment summary records returned by
     * the search.
     *
     * Each element in this array is an
     * `IShoppingMallInventoryAndFulfillmentSearch.ISummary` object that
     * condenses information from `shopping_mall_inventory_items`,
     * `shopping_mall_fulfillments`, and related catalog and order tables,
     * such as SKU identifiers, available and reserved quantities,
     * fulfillment counts, and shipment indicators.
     *
     * The order of items in this collection reflects the sort criteria
     * specified in the associated
     * `IShoppingMallInventoryAndFulfillmentSearch.IRequest` (for example,
     * by SKU code, available quantity, or latest fulfillment creation
     * time), allowing back‑office UIs to render stable, paginated grids for
     * platform administrators.
     */
    data: IShoppingMallInventoryAndFulfillmentSearch.ISummary[];
  };
}
