import { IPage } from "./IPage";
import { IShoppingMallOrderCancellation } from "./IShoppingMallOrderCancellation";

export namespace IPageIShoppingMallOrderCancellation {
  /**
   * Paginated response wrapper containing a list of order cancellation
   * request summaries with pagination metadata.
   *
   * This type represents the standard paginated response format for order
   * cancellation list operations. It combines an array of cancellation
   * summary records with comprehensive pagination information, enabling
   * efficient navigation through potentially large result sets from the
   * shopping_mall_order_cancellations table.
   *
   * Used as the response type for administrative cancellation search and
   * retrieval operations, particularly the PATCH
   * /shoppingMall/admin/cancellations endpoint. The pagination structure
   * supports configurable page sizes, multi-field sorting, and complex
   * filtering criteria including cancellation status, order identifiers,
   * buyer information, and date ranges.
   *
   * The data array contains lightweight summary representations optimized for
   * list displays, providing essential cancellation details without the
   * complete approval workflow history or detailed admin notes. Clients can
   * use the pagination metadata to implement page navigation controls and
   * display result position information to users.
   */
  export type ISummary = {
    /**
     * Pagination metadata providing information about the current page
     * position, total records, and navigation context.
     *
     * Includes the current page number, page size limit, total record count
     * across all pages, and calculated total page count. This metadata
     * enables clients to implement pagination controls, display page
     * position indicators, and calculate whether previous/next page
     * navigation is available.
     *
     * Essential for building user-friendly list interfaces that handle
     * large datasets efficiently.
     */
    pagination: IPage.IPagination;

    /**
     * Array of order cancellation request summary records matching the
     * search and filter criteria.
     *
     * Each element provides essential cancellation information including
     * the cancellation ID, reason code, approval status, refund amount,
     * request timestamp, and summary references to the associated order and
     * requesting actor (buyer or seller).
     *
     * The array length is controlled by the pagination limit parameter and
     * may be empty if no cancellations match the specified criteria. Array
     * ordering is determined by the sort_by and order parameters from the
     * request.
     */
    data: IShoppingMallOrderCancellation.ISummary[];
  };
}
