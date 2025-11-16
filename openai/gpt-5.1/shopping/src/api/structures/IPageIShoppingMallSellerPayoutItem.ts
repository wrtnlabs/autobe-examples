import { IPage } from "./IPage";
import { IShoppingMallSellerPayoutItem } from "./IShoppingMallSellerPayoutItem";

export namespace IPageIShoppingMallSellerPayoutItem {
  /**
   * Paginated collection of seller payout item summaries for a specific
   * seller payout batch.
   *
   * This DTO wraps an array of `IShoppingMallSellerPayoutItem.ISummary`
   * records together with standard pagination metadata so that platform
   * administrators can page through the detailed composition of a seller
   * payout created in the `shopping_mall_seller_payout_items` table. It is
   * specifically used as the response body for the `PATCH
   * /shoppingMall/platformAdmin/sellerPayouts/{sellerPayoutId}/items`
   * operation, where each page represents one window of payout components for
   * the selected seller payout.
   */
  export type ISummary = {
    /**
     * Pagination metadata that describes the current slice of seller payout
     * items being returned for the requested payout batch.
     *
     * This object exposes the current page index, page size, total record
     * count, and total page count so that platform administrators can
     * efficiently navigate through the full set of payout items associated
     * with a single seller payout record in `shopping_mall_seller_payouts`.
     * It follows the shared pagination contract used across the
     * shoppingMall APIs so that back-office UIs can reuse common paging
     * components.
     */
    pagination: IPage.IPagination;

    /**
     * List of seller payout item summaries that belong to the selected
     * seller payout batch and match the applied filter and sorting
     * criteria.
     *
     * Each element is an `IShoppingMallSellerPayoutItem.ISummary` DTO
     * representing a single component row from the
     * `shopping_mall_seller_payout_items` table, such as item-level
     * revenue, fee deductions, or manual adjustments. This array
     * corresponds to one paginated slice of the full result set used by the
     * `PATCH
     * /shoppingMall/platformAdmin/sellerPayouts/{sellerPayoutId}/items`
     * endpoint for administrative reconciliation views.
     */
    data: IShoppingMallSellerPayoutItem.ISummary[];
  };
}
