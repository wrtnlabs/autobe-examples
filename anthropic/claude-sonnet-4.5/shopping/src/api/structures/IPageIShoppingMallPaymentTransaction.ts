import { IPage } from "./IPage";
import { IShoppingMallPaymentTransaction } from "./IShoppingMallPaymentTransaction";

export namespace IPageIShoppingMallPaymentTransaction {
  /**
   * Paginated response wrapper for payment transaction search queries.
   *
   * This schema represents the complete response structure for payment
   * transaction retrieval operations, combining pagination metadata with an
   * array of transaction summaries. It supports efficient querying and
   * display of potentially extensive transaction histories while maintaining
   * optimal response sizes and system performance.
   *
   * Used across multiple actor contexts including buyer payment history
   * views, seller revenue tracking dashboards, and administrator financial
   * audit interfaces. The pagination wrapper enables different user types to
   * navigate through their relevant transaction subsets based on their
   * authorization scope and search filters.
   *
   * Each actor sees filtered transaction data appropriate to their role:
   * buyers view their own order payments, sellers see transactions for their
   * products, and administrators access platform-wide transaction records for
   * financial oversight and dispute resolution. The consistent pagination
   * structure ensures uniform client-side implementation regardless of actor
   * type or search complexity.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the payment transaction query results.
     *
     * Provides essential navigation information including current page
     * number, total pages available, records per page limit, and total
     * transaction count matching the search criteria. This metadata enables
     * clients to implement comprehensive pagination controls for navigating
     * through potentially large transaction datasets spanning multiple
     * pages.
     *
     * Critical for financial reporting and audit trail interfaces where
     * users need to navigate through extensive transaction histories while
     * maintaining performance and usability. The pagination metadata works
     * in conjunction with the transaction data array to provide complete
     * context about result set positioning.
     */
    pagination: IPage.IPagination;

    /**
     * Array of payment transaction summary records for the current page.
     *
     * Contains the actual transaction data matching the search filters,
     * with each element representing a payment transaction record from the
     * shopping_mall_payment_transactions table. The array length is
     * determined by the pagination limit and may be smaller than the limit
     * on the final page.
     *
     * Each transaction summary includes key transaction details such as
     * transaction type (authorization, capture, void, refund), payment
     * amount, currency, processing status, payment provider, and
     * transaction timestamp. This provides sufficient information for
     * displaying transaction history, financial reporting, dispute
     * resolution, and audit trail reviews without exposing sensitive
     * payment card details in compliance with PCI standards.
     */
    data: IShoppingMallPaymentTransaction.ISummary[];
  };
}
