import { IPage } from "./IPage";
import { IShoppingMallBuyer } from "./IShoppingMallBuyer";

export namespace IPageIShoppingMallBuyer {
  /**
   * Paginated response wrapper for buyer account summary lists.
   *
   * This response type encapsulates paginated buyer account data returned
   * from search and list operations. It combines pagination metadata with an
   * array of buyer summary records, enabling efficient navigation through
   * large buyer datasets in administrative interfaces.
   *
   * The pagination property provides essential navigation information
   * including current page number, total record count, and page boundaries.
   * This metadata allows clients to implement pagination controls, display
   * result counts, and calculate total page numbers for user interfaces.
   *
   * The data array contains buyer summary records for the current page, with
   * each element providing essential buyer identification and display
   * information. The array length is controlled by the limit parameter in the
   * request and may be shorter than the limit on the final page or when fewer
   * results match the search criteria.
   *
   * This structure supports common administrative workflows such as buyer
   * account management, customer support lookups, and platform analytics. The
   * separation of pagination metadata from data allows clients to handle edge
   * cases like empty result sets while maintaining consistent response
   * structure.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the buyer account result set.
     *
     * Provides essential information for navigating through paginated buyer
     * lists, including current page position, total record count, and page
     * size limits. Clients use this metadata to implement pagination
     * controls and understand the complete dataset scope.
     */
    pagination: IPage.IPagination;

    /**
     * Array of buyer account summary records for the current page.
     *
     * Contains the actual buyer data matching the search criteria and
     * filtered to the current page boundaries. May be empty if no buyers
     * match the search criteria or if requesting a page beyond the
     * available data range.
     */
    data: IShoppingMallBuyer.ISummary[];
  };
}
