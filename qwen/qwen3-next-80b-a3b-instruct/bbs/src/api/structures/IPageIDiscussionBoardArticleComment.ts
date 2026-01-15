import { IPage } from "./IPage";
import { IDiscussionBoardArticleComment } from "./IDiscussionBoardArticleComment";

export namespace IPageIDiscussionBoardArticleComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleComment.ISummary[];
  };
}
