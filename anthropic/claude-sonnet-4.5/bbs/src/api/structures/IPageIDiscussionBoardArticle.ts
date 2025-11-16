import { IPage } from "./IPage";
import { IDiscussionBoardArticle } from "./IDiscussionBoardArticle";

export namespace IPageIDiscussionBoardArticle {
  /**
   * Paginated response containing discussion board article summaries.
   *
   * This wrapper type encapsulates a paginated list of article summaries
   * along with pagination metadata, following the standard page response
   * pattern used throughout the API. It provides both the article data for
   * the current page and the pagination information needed to navigate
   * through the complete result set.
   *
   * Used as the response type for article list and search operations where
   * users discover articles through keyword search, author filtering, date
   * range filtering, and sorting options. The structure separates pagination
   * metadata from the actual data array, enabling clients to render
   * pagination controls independently from the article list.
   *
   * This design supports efficient browsing and discovery of potentially
   * large article collections while maintaining optimal response sizes and
   * server performance. Clients can use the pagination metadata to implement
   * page navigation controls, display result counts (e.g., "Showing 21-40 of
   * 156 articles"), and manage infinite scrolling or load-more interfaces for
   * mobile and web applications.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the article list.
     *
     * Provides comprehensive pagination information including current page
     * number, records per page limit, total record count in the database,
     * and total page count. This metadata enables clients to implement
     * pagination controls, display page indicators, and navigate through
     * large article result sets efficiently.
     *
     * The pagination object follows standard patterns used across all
     * paginated endpoints in the system, ensuring consistent pagination
     * behavior and user experience throughout the API.
     */
    pagination: IPage.IPagination;

    /**
     * Array of article summaries matching the search and filter criteria.
     *
     * Contains the actual article records for the current page, with each
     * element representing a lightweight summary of a discussion board
     * article. The array length will be at most equal to the pagination
     * limit, and may be less on the final page or when fewer articles match
     * the search criteria.
     *
     * Each article summary includes essential information (ID, title,
     * creation timestamp, author summary) optimized for list displays and
     * search results. Article bodies, images, files, and detailed metadata
     * are excluded from summaries to maintain optimal performance. For
     * complete article details, retrieve individual articles via dedicated
     * endpoints.
     */
    data: IDiscussionBoardArticle.ISummary[];
  };
}
