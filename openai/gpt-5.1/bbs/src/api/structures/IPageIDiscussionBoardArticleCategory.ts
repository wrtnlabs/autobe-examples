import { IPage } from "./IPage";
import { IDiscussionBoardArticleCategory } from "./IDiscussionBoardArticleCategory";

export namespace IPageIDiscussionBoardArticleCategory {
  /**
   * Paginated container of discussion board article category summaries
   * returned by search operations.
   *
   * This DTO is used as the response body for the `PATCH
   * /discussionBoard/articleCategories` endpoint, wrapping a page of
   * `IDiscussionBoardArticleCategory.ISummary` records together with
   * pagination metadata. It represents the result of querying the
   * `discussion_board_article_categories` Prisma model with filters, sort
   * options, and paging parameters defined by
   * `IDiscussionBoardArticleCategory.IRequest`, and is optimized for
   * navigation menus, article creation flows, and category management
   * screens.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of article category
     * results.
     *
     * This property follows the shared `IPage.IPagination` structure,
     * exposing the current page index, page size limit, total number of
     * matching records, and total page count. Clients use this information
     * to render paging controls (for example, next/previous buttons) and to
     * decide when they have reached the beginning or end of the result set
     * when browsing categories.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of article category summary records for the
     * current page.
     *
     * Each element is an `IDiscussionBoardArticleCategory.ISummary` DTO
     * derived from a row in the `discussion_board_article_categories`
     * Prisma model and shaped for lightweight list rendering. The server
     * applies any search, filter, and sort criteria from
     * `IDiscussionBoardArticleCategory.IRequest` before populating this
     * array, so it contains only the categories that match the caller's
     * query for this specific page.
     */
    data: IDiscussionBoardArticleCategory.ISummary[];
  };
}
