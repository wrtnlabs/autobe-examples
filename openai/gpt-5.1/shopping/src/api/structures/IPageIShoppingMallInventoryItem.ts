import { IPage } from "./IPage";
import { IShoppingMallInventoryItem } from "./IShoppingMallInventoryItem";

export namespace IPageIShoppingMallInventoryItem {
  /**
   * Paginated list of inventory item summaries for the shopping mall
   * platform.
   *
   * This wrapper type is used as the response body for the
   * `/shoppingMall/inventoryItems` PATCH endpoint, which queries the
   * `shopping_mall_inventory_items` Prisma table based on search criteria
   * provided in `IShoppingMallInventoryItem.IRequest`. The `pagination` field
   * exposes paging metadata, while `data` contains the current page of
   * `IShoppingMallInventoryItem.ISummary` records that summarize on-hand
   * quantity, reserved quantity, stock status, and configuration flags for
   * each SKU.
   *
   * Consumers typically use this schema in backoffice dashboards, internal
   * operational tools, and seller inventory consoles to display lists of
   * inventory items with standard pagination controls. It ensures that list
   * views remain lightweight by embedding only summary-level information for
   * each inventory item and delegating detailed inspection to dedicated
   * detail endpoints when necessary.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Represents the pagination metadata for this inventory item list,
     * including the current page index, page size, total record count, and
     * total pages. Clients use this object to drive paging controls in
     * backoffice consoles and internal tools that inspect inventory state.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * Each element in this array is an
     * `IShoppingMallInventoryItem.ISummary` DTO that provides a lightweight
     * snapshot of per-SKU inventory state derived from the
     * `shopping_mall_inventory_items` Prisma model. The collection
     * represents the current page of results returned by the inventory
     * search endpoint.
     */
    data: IShoppingMallInventoryItem.ISummary[];
  };
}
