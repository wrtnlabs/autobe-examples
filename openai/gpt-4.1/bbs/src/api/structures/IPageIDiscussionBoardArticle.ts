import { IPage } from "./IPage";
import { IDiscussionBoardArticle } from "./IDiscussionBoardArticle";

export namespace IPageIDiscussionBoardArticle {
  /**
   * Paginated result set schema for a collection of article summaries from
   * discussion_board_articles.
   *
   * The `data` field contains brief summaries of multiple articles (using
   * IDiscussionBoardArticle.ISummary variant), while `pagination` provides
   * metadata for navigating through multi-page article feeds. Used for main
   * community feeds, search/filter results, or moderation views where sets of
   * articles are presented to users or admins.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the retrieved page. Contains current page,
     * total records, page limit, and calculated total pages for the
     * articles listing.
     */
    pagination: IPage.IPagination;

    /**
     * Array of article summary DTOs (IDiscussionBoardArticle.ISummary) for
     * the current page result set. Each entry represents lightweight
     * business data (id, title, creation timestamp, author reference, etc.)
     * for an article returned in a listing or search interface.
     */
    data: IDiscussionBoardArticle.ISummary[];
  };
}
