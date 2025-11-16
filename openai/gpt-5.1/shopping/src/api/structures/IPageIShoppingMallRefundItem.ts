import { IPage } from "./IPage";
import { IShoppingMallRefundItem } from "./IShoppingMallRefundItem";

export namespace IPageIShoppingMallRefundItem {
  /**
   * Paginated collection of refund item summaries for a single refund
   * transaction.
   *
   * This DTO is returned by the `PATCH
   * /shoppingMall/platformAdmin/refundTransactions/{refundTransactionId}/items`
   * endpoint, which queries the `shopping_mall_refund_items` table scoped by
   * a parent `shopping_mall_refund_transactions.id`. It allows administrators
   * and customer support agents to inspect the per-item breakdown of a refund
   * transaction, including which order lines were affected and how much was
   * refunded at the line level.
   *
   * The `pagination` property provides standard page metadata via
   * `IPage.IPagination`, while the `data` array contains
   * `IShoppingMallRefundItem.ISummary` entries for the current page. Internal
   * tools use this paginated structure to navigate large refunds with many
   * items, reconcile refunded amounts against orders and payment
   * transactions, and support detailed after-sales investigations without
   * loading all line items into memory at once.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of refund items.
     *
     * This follows the shared `IPage.IPagination` schema and indicates the
     * current page index, page size, total count of refund items under the
     * scoped refund transaction, and total number of pages. It enables
     * backoffice tools to page through line-level refund details
     * efficiently.
     */
    pagination: IPage.IPagination;

    /**
     * List of refund item summaries belonging to the current page.
     *
     * Each element is an `IShoppingMallRefundItem.ISummary` DTO that
     * represents a single line-level component of a refund, typically
     * linked to a specific order line and SKU. These summaries expose
     * identifiers, refunded quantities, per-line refund amounts,
     * currencies, and light contextual associations so that staff can
     * understand how the parent refund amount is allocated across items.
     */
    data: IShoppingMallRefundItem.ISummary[];
  };
}
