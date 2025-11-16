import { IPage } from "./IPage";
import { IShoppingMallInventoryReservation } from "./IShoppingMallInventoryReservation";

export namespace IPageIShoppingMallInventoryReservation {
  /**
   * Paginated list of inventory reservation summaries associated with a
   * specific inventory item.
   *
   * This wrapper type is used as the response body for the `PATCH
   * /shoppingMall/platformAdmin/inventoryItems/{inventoryItemId}/reservations`
   * endpoint, which queries the `shopping_mall_inventory_reservations` Prisma
   * model for reservations linked to a single `shopping_mall_inventory_items`
   * record. The `pagination` field reports summary paging metrics, while
   * `data` contains the current page of
   * `IShoppingMallInventoryReservation.ISummary` entries that describe how a
   * particular inventory item is reserved across orders and order lines.
   *
   * Platform administrators and internal operations tools rely on this schema
   * to inspect, audit, and monitor reservation activity for a given inventory
   * item, especially during high-traffic periods or when analyzing stock
   * allocation problems. It keeps the payload focused on summary-level
   * reservation data suitable for list and dashboard views, while more
   * detailed inspection is handled by dedicated reservation detail
   * endpoints.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Contains standard pagination metadata for the reservations list,
     * including current page index, items per page, total number of
     * reservations, and total pages. This information allows administrative
     * UIs to build paging controls when browsing reservations for a
     * specific inventory item.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * Each element is an `IShoppingMallInventoryReservation.ISummary` DTO
     * representing a single reservation row from the
     * `shopping_mall_inventory_reservations` model. These summaries include
     * identifiers, reserved quantities, key timestamps, and optional links
     * to related orders or order lines, and together they form the current
     * page of results for the reservations search.
     */
    data: IShoppingMallInventoryReservation.ISummary[];
  };
}
