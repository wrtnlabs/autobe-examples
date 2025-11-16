import { IPage } from "./IPage";
import { IDiscussionBoardArticle } from "./IDiscussionBoardArticle";

export namespace IPageIDiscussionBoardArticle {
  /**
   * Paginated collection of article summaries with navigation metadata.
   *
   * This type wraps a collection of article summary objects with
   * comprehensive pagination information, enabling efficient navigation
   * through large result sets. Returned in response to article search,
   * filtering, and discovery operations.
   *
   * The response structure separates pagination metadata (for navigation and
   * total count) from the actual data (article summaries). This allows
   * clients to implement pagination controls (page numbers, next/previous
   * buttons) independently from the article display logic.
   *
   * Typically used for: article list views, search results display, category
   * browsing, moderation queue viewing, and any operation returning multiple
   * articles. The pagination metadata enables clients to fetch subsequent
   * pages and understand the total scope of available articles matching the
   * specified filters and search criteria.
   */
  export type ISummary = {
    /**
     * Pagination metadata providing navigation information for the result
     * set.
     *
     * This object contains the current page number, page size limit, total
     * number of records in the database, and calculated total number of
     * pages. Enables clients to determine their position within the result
     * set and navigate between pages using the limit and page parameters.
     *
     * Clients use pagination metadata to construct subsequent requests with
     * different page numbers, implement "Next" and "Previous" buttons,
     * display page numbers to users, and understand the total scope of
     * available data.
     */
    pagination: IPage.IPagination;

    /**
     * Array of article summary objects matching the search and filter
     * criteria.
     *
     * Each element is a IDiscussionBoardArticle.ISummary containing
     * essential article information (id, title, status, creator, category,
     * timestamps, engagement metrics) optimized for efficient list display.
     * The array length will not exceed the 'limit' parameter specified in
     * the request, and typically contains fewer items on the final page.
     *
     * Articles are ordered according to the sort_by and sort_order
     * parameters specified in the request. The specific articles included
     * are determined by search query, status filter, category filter,
     * member filter, and date range filters from the request parameters.
     */
    data: IDiscussionBoardArticle.ISummary[];
  };
}
