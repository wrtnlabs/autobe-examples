import { IPage } from "./IPage";
import { IShoppingMallRefundTransaction } from "./IShoppingMallRefundTransaction";

export namespace IPageIShoppingMallRefundTransaction {
  /**
   * Paginated response wrapper for refund transaction search results.
   *
   * This response structure wraps filtered refund transaction summaries with
   * pagination metadata, enabling efficient navigation through large datasets
   * of refund payment processing records. Used by administrative dashboards
   * and financial reporting interfaces to display refund transaction lists
   * with proper pagination controls.
   *
   * The pagination object provides navigation information including current
   * page position, page size configuration, total record count across all
   * pages, and calculated total page count. The data array contains the
   * actual refund transaction summaries for the current page, each providing
   * essential refund details without full audit information.
   *
   * This structure supports the refund transaction search operations on the
   * shopping_mall_refund_transactions table, allowing administrators and
   * authorized users to browse through refund processing history with
   * filtering by status, amount ranges, payment providers, and temporal
   * criteria. The pagination enables handling of large refund transaction
   * datasets spanning multiple orders, buyers, and settlement periods.
   *
   * Typical usage includes admin financial reconciliation dashboards, refund
   * status monitoring interfaces, payment provider reconciliation reports,
   * and customer support tools for tracking refund processing. The paginated
   * structure ensures responsive performance even with extensive refund
   * transaction histories.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Contains current page number, page size limit, total record count,
     * and total page count for navigating through the complete refund
     * transaction dataset.
     */
    pagination: IPage.IPagination;

    /**
     * List of refund transaction summary records.
     *
     * Array of refund transaction summaries matching the search criteria,
     * containing essential information about refund payment processing
     * including transaction IDs, amounts, status, and timestamps.
     */
    data: IShoppingMallRefundTransaction.ISummary[];
  };
}
