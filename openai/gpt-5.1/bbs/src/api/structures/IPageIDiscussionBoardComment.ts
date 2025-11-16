import { IPage } from "./IPage";
import { IDiscussionBoardComment } from "./IDiscussionBoardComment";

export namespace IPageIDiscussionBoardComment {
  /**
   * Paginated container of discussion board comment summaries for a single
   * article.
   *
   * This DTO serves as the response body for the `PATCH
   * /discussionBoard/articles/{articleId}/comments` endpoint, combining
   * pagination metadata with a page of `IDiscussionBoardComment.ISummary`
   * items. It encapsulates filtered and sorted comment data from the
   * `discussion_board_comments` Prisma model for the specified article,
   * enabling clients to display long comment threads in manageable pages
   * without loading the entire set at once.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of comment results.
     *
     * This object follows the `IPage.IPagination` contract and reports the
     * current page index, page size, total number of comments that match
     * the applied filters, and the computed total page count. Clients use
     * this information to implement paged comment lists on article detail
     * screens, including controls to move between older and newer comment
     * pages.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of comment summary records for the current page.
     *
     * Each item is an `IDiscussionBoardComment.ISummary` DTO representing a
     * single row from the `discussion_board_comments` table, enriched with
     * article and author summary context for efficient list rendering. The
     * array contains only comments for the scoped article and matching any
     * search, status, or sort options provided via
     * `IDiscussionBoardComment.IRequest`, making it suitable for
     * infinite-scroll or discrete page navigation patterns.
     */
    data: IDiscussionBoardComment.ISummary[];
  };
}
