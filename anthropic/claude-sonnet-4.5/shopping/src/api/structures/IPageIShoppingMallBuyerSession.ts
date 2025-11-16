import { IPage } from "./IPage";
import { IShoppingMallBuyerSession } from "./IShoppingMallBuyerSession";

export namespace IPageIShoppingMallBuyerSession {
  /**
   * Paginated response wrapper for buyer authentication session lists.
   *
   * This response type encapsulates paginated session data returned from
   * session monitoring and security audit operations. It combines pagination
   * metadata with an array of session summary records, enabling
   * administrators to efficiently navigate through potentially large session
   * histories.
   *
   * The pagination property provides critical navigation metadata including
   * current page number, total session count, and page boundaries. This
   * information enables implementation of pagination controls in security
   * dashboards, calculation of total page counts, and display of
   * comprehensive session statistics.
   *
   * The data array contains session summary records for the current page,
   * with each element providing essential session identification, timing, and
   * connection information. Array length is determined by the limit parameter
   * and may be shorter on final pages or when filter criteria match fewer
   * sessions than the page size.
   *
   * This structure supports security monitoring workflows including session
   * tracking, suspicious login investigation, and authentication audit
   * trails. The consistent response structure allows graceful handling of
   * edge cases such as buyers with no session history while maintaining
   * uniform API contracts across all session query operations.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the session result set.
     *
     * Provides navigation information for browsing through session history,
     * including current page position, total session count, and page size
     * configuration. Essential for implementing pagination controls in
     * administrative monitoring interfaces.
     */
    pagination: IPage.IPagination;

    /**
     * Array of buyer session summary records for the current page.
     *
     * Contains the session records matching the filter criteria and bounded
     * by the current page limits. May be empty if no sessions match the
     * specified filters or if requesting a page beyond available data.
     */
    data: IShoppingMallBuyerSession.ISummary[];
  };
}
