import { IPage } from "./IPage";
import { IShoppingMallRefundRequest } from "./IShoppingMallRefundRequest";

export namespace IPageIShoppingMallRefundRequest {
  /**
   * Paginated response wrapper containing a list of refund request summaries
   * with pagination metadata.
   *
   * This type represents the standard paginated response format for refund
   * request list operations. It combines an array of refund request summary
   * records with comprehensive pagination information, enabling efficient
   * navigation through potentially large result sets from the
   * shopping_mall_refund_requests table.
   *
   * Used as the response type for administrative refund request search and
   * management operations, particularly the PATCH
   * /shoppingMall/admin/refundRequests endpoint. The pagination structure
   * supports configurable page sizes, multi-field sorting, and complex
   * filtering criteria including buyer, order, approval status, amount
   * ranges, date ranges, and full-text search on refund reasons and notes.
   *
   * The data array contains lightweight summary representations optimized for
   * administrative dashboards and queue management interfaces, providing
   * essential refund request details without the complete approval workflow
   * history or detailed admin decision notes. Clients can use the pagination
   * metadata to implement page navigation controls and display result
   * position information to administrators reviewing refund requests.
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
     * Array of refund request summary records matching the search and
     * filter criteria.
     *
     * Each element provides essential refund request information including
     * the request ID, tracking number, refund reason category, requested
     * amount, approval status, and submission timestamp.
     *
     * The array length is controlled by the pagination limit parameter and
     * may be empty if no refund requests match the specified criteria.
     * Array ordering is determined by the sort_by and sort_order parameters
     * from the request.
     */
    data: IShoppingMallRefundRequest.ISummary[];
  };
}
