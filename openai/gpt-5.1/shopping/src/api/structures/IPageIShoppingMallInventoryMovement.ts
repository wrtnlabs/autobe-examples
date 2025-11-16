import { IPage } from "./IPage";
import { IShoppingMallInventoryMovement } from "./IShoppingMallInventoryMovement";

export namespace IPageIShoppingMallInventoryMovement {
  /**
   * Paginated collection of inventory movement summary records for a single
   * inventory item.
   *
   * This schema wraps a list of `IShoppingMallInventoryMovement.ISummary`
   * objects together with paging metadata from `IPage.IPagination`. It is
   * used as the response body for the `PATCH
   * /shoppingMall/inventoryItems/{inventoryItemId}/movements` endpoint, which
   * reads from the `shopping_mall_inventory_movements` Prisma model scoped by
   * a parent `shopping_mall_inventory_items` record.
   *
   * Clients use this structure to browse the historical sequence of quantity
   * changes for a specific SKU/location combination without loading the
   * entire movement history at once. The `pagination` object describes how
   * many total movement records exist and where the current page sits within
   * that set, while the `data` array contains only the movement summaries for
   * the requested slice.
   *
   * In typical usage, callers will:
   *
   * - Inspect `pagination.current`, `pagination.limit`, `pagination.records`,
   *   and `pagination.pages` to drive paging controls in UIs.
   * - Iterate over `data` to render movement rows including identifiers,
   *   timestamps, movement types, and quantity deltas.
   * - Request additional pages by adjusting the search request (for example,
   *   changing `page` or `limit` in
   *   `IShoppingMallInventoryMovement.IRequest`) based on the information
   *   provided here.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Encapsulates the current page index, page size, total record count,
     * and total page count for the inventory movement history query.
     */
    pagination: IPage.IPagination;

    /**
     * List of inventory movement summary records returned for the current
     * page.
     *
     * Each element is an `IShoppingMallInventoryMovement.ISummary` DTO
     * representing a single stock change event for the targeted inventory
     * item.
     */
    data: IShoppingMallInventoryMovement.ISummary[];
  };
}
