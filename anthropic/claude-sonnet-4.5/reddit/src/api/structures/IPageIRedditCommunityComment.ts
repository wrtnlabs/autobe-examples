import { IPage } from "./IPage";
import { IRedditCommunityComment } from "./IRedditCommunityComment";

export namespace IPageIRedditCommunityComment {
  /**
   * Paginated collection of comment summaries returned by comment retrieval
   * and search operations.
   *
   * This pagination wrapper encapsulates both the result data array and
   * pagination metadata, enabling clients to efficiently navigate through
   * large comment collections within posts and reply threads. The structure
   * follows the standard IPage<T> pattern used throughout the platform for
   * consistent paginated response handling.
   *
   * The pagination field provides metadata about the current page position,
   * page size configuration, total comment count, and calculated total pages.
   * This information enables clients to render pagination controls, implement
   * "load more comments" functionality, and display comment count indicators
   * in threaded discussion views.
   *
   * The data field contains the actual comment summaries for the current
   * page, with each comment including full text content, vote scores, nesting
   * depth indicators (for proper indentation), author details, and post
   * context. The array respects the configured page limit and may contain
   * fewer items on the final page or when filtering yields limited results.
   *
   * Used as the response type for comment listing operations including post
   * comment threads, nested reply retrieval, and comment search results.
   * Clients consume this structure to render paginated comment lists with
   * threading visualization, voting controls, and reply functionality while
   * efficiently managing large discussion threads through pagination.
   */
  export type ISummary = {
    /**
     * Pagination metadata providing current page position, page size
     * limits, total record count, and total page count.
     *
     * This metadata enables clients to implement pagination controls
     * (previous/next buttons, page numbers, load more functionality) and
     * understand their position within the complete comment collection.
     *
     * The pagination object follows the standard IPage.IPagination
     * structure used consistently across all paginated endpoints in the
     * platform.
     */
    pagination: IPage.IPagination;

    /**
     * Array of comment summary objects representing the current page of
     * results.
     *
     * Each element provides complete comment information including content
     * text, vote scores, nesting depth indicators, timestamps, author
     * details, and post context. Unlike posts, comments include full
     * content text even in summary form since comment text is typically
     * concise and needed for threaded discussion context.
     *
     * The array length will be less than or equal to the pagination.limit
     * value, and may be empty if no comments match the search criteria, if
     * the post has no comments, or if requesting a page beyond the
     * available data.
     */
    data: IRedditCommunityComment.ISummary[];
  };
}
