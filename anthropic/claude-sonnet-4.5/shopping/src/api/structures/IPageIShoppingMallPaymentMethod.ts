import { IPage } from "./IPage";
import { IShoppingMallPaymentMethod } from "./IShoppingMallPaymentMethod";

export namespace IPageIShoppingMallPaymentMethod {
  /**
   * Paginated response wrapper for buyer payment method queries.
   *
   * This schema represents the complete response structure for payment method
   * search operations, combining pagination metadata with an array of payment
   * method summaries. It enables efficient retrieval and display of
   * potentially large sets of saved payment methods while maintaining
   * reasonable response sizes and optimal performance.
   *
   * Used as the response type for buyer payment method search endpoints, this
   * wrapper supports various use cases including checkout payment method
   * selection, account settings management, and payment method maintenance
   * workflows. The pagination structure allows buyers with many saved payment
   * methods to navigate through their complete payment method list
   * efficiently.
   *
   * The schema follows the standard pagination pattern used throughout the
   * shopping mall platform, ensuring consistent client-side pagination
   * implementation across different resource types.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the payment method query results.
     *
     * Provides essential information for navigating through the complete
     * set of payment methods including current page number, total pages,
     * records per page, and total record count. This metadata enables
     * clients to implement pagination controls such as page number
     * selectors, next/previous buttons, and result count displays.
     *
     * The pagination object works in conjunction with the data array to
     * provide a complete view of where the current result set fits within
     * the overall query results.
     */
    pagination: IPage.IPagination;

    /**
     * Array of payment method summary records matching the search criteria.
     *
     * Contains the actual payment method data for the current page, with
     * each element representing a saved payment method belonging to the
     * authenticated buyer. The array length is determined by the pagination
     * limit parameter and may be smaller than the limit on the final page
     * of results.
     *
     * Each payment method summary includes essential identification
     * information such as payment type, masked card details, and
     * verification status, providing sufficient information for buyers to
     * recognize and select payment methods during checkout or account
     * management workflows.
     */
    data: IShoppingMallPaymentMethod.ISummary[];
  };
}
