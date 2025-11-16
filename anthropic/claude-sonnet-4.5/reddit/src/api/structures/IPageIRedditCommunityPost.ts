import { IPage } from "./IPage";
import { IRedditCommunityPost } from "./IRedditCommunityPost";

export namespace IPageIRedditCommunityPost {
  /**
   * Paginated collection of post summaries returned by post search and
   * listing operations.
   *
   * This pagination wrapper encapsulates both the result data array and
   * pagination metadata, enabling clients to efficiently navigate through
   * large post collections across communities. The structure follows the
   * standard IPage<T> pattern used throughout the platform for consistent
   * paginated response handling.
   *
   * The pagination field provides metadata about the current page position,
   * page size configuration, total record count, and calculated total pages.
   * This information enables clients to render pagination controls, display
   * progress indicators, and implement infinite scroll patterns.
   *
   * The data field contains the actual post summaries for the current page,
   * with each post including essential information for feed rendering: title,
   * post type, vote scores, comment counts, author details, and community
   * context. Array length respects the configured page limit and may contain
   * fewer items on the final page or when filtering yields limited results.
   *
   * Used as the response type for post feed operations including community
   * browsing, global post discovery, filtered searches, and sorted views
   * (hot, new, top, controversial). Clients consume this structure to render
   * post lists with pagination controls for seamless navigation through large
   * content collections.
   */
  export type ISummary = {
    /**
     * Pagination metadata providing current page position, page size
     * limits, total record count, and total page count.
     *
     * This metadata enables clients to implement pagination controls
     * (previous/next buttons, page numbers, progress indicators) and
     * understand their position within the complete result set.
     *
     * The pagination object follows the standard IPage.IPagination
     * structure used consistently across all paginated endpoints in the
     * platform.
     */
    pagination: IPage.IPagination;

    /**
     * Array of post summary objects representing the current page of
     * results.
     *
     * Each element provides essential post information optimized for feed
     * display including title, post type, vote scores, comment counts,
     * timestamps, author details, and community context.
     *
     * The array length will be less than or equal to the pagination.limit
     * value, and may be empty if no posts match the search criteria or if
     * requesting a page beyond the available data.
     */
    data: IRedditCommunityPost.ISummary[];
  };
}
