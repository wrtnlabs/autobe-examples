import { IPage } from "./IPage";
import { IDiscussionBoardArticleTag } from "./IDiscussionBoardArticleTag";

export namespace IPageIDiscussionBoardArticleTag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleTag.ISummary[];
  };
}
