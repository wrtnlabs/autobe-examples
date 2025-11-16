import { IPage } from "./IPage";
import { IDiscussionBoardArticle } from "./IDiscussionBoardArticle";

export namespace IPageIDiscussionBoardArticle {
  /**
   * Paged collection of discussion board article summaries backed by the
   * `discussion_board_articles` Prisma model.
   *
   * This schema is a concrete specialization of the generic `IPage<T>`
   * pattern where `T` is `IDiscussionBoardArticle.ISummary`. It is used as
   * the response body for article list and search endpoints such as `PATCH
   * /discussionBoard/articles` and `PATCH
   * /discussionBoard/memberUser/members/{memberUserId}/likedArticles`,
   * combining pagination metadata in `pagination` with an array of article
   * summary records in `data`.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of article results.
     *
     * This property is an `IPage.IPagination` object that exposes the
     * current 1-based page index, the requested page size, the total number
     * of matching article records, and the computed total number of pages.
     * It allows clients to implement paging controls (next/previous
     * buttons, page number links) consistently across endpoints that return
     * `IDiscussionBoardArticle.ISummary` items.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of article summary records for the requested page.
     *
     * Each element in this array is an `IDiscussionBoardArticle.ISummary`
     * instance derived from the `discussion_board_articles` Prisma model
     * and its related category/author summary projections. The array can be
     * empty when no articles match the given search and filter criteria,
     * even though `pagination` will still describe the requested page
     * context.
     */
    data: IDiscussionBoardArticle.ISummary[];
  };
}
