import { IPage } from "./IPage";
import { IShoppingMallSellerPayout } from "./IShoppingMallSellerPayout";

export namespace IPageIShoppingMallSellerPayout {
  /**
   * Paginated response wrapper for seller payout search results.
   *
   * This response structure wraps filtered seller payout summaries with
   * pagination metadata, enabling efficient navigation through large datasets
   * of seller earnings settlement records. Used by seller earnings dashboards
   * and administrative financial management interfaces to display payout
   * lists with proper pagination controls.
   *
   * The pagination object provides navigation information including current
   * page position, page size configuration, total record count across all
   * pages, and calculated total page count. The data array contains the
   * actual seller payout summaries for the current page, each providing
   * essential settlement details including period dates, net payout amounts
   * after commission deductions, processing status, and creation timestamps.
   *
   * This structure supports the seller payout search operations on the
   * shopping_mall_seller_payouts table, allowing sellers to track their
   * earnings settlements and administrators to manage platform-wide payout
   * processing. Pagination enables handling of extensive payout histories
   * spanning multiple settlement cycles, sellers, and payout periods with
   * filtering by status, settlement dates, amount ranges, and payment
   * methods.
   *
   * Typical usage includes seller earnings tracking dashboards where
   * merchants monitor their settlement schedules and completed payouts,
   * administrative financial reconciliation interfaces for managing payout
   * batch processing, and financial reporting tools for analyzing platform
   * revenue distribution. The paginated structure ensures responsive
   * performance when browsing through years of settlement history across
   * hundreds or thousands of seller accounts.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Contains current page number, page size limit, total record count,
     * and total page count for navigating through the complete seller
     * payout dataset.
     */
    pagination: IPage.IPagination;

    /**
     * List of seller payout summary records.
     *
     * Array of seller payout summaries matching the search criteria,
     * containing essential information about earnings settlements including
     * payout IDs, settlement periods, net amounts, status, and processing
     * timestamps.
     */
    data: IShoppingMallSellerPayout.ISummary[];
  };
}
