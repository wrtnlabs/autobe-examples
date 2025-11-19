import { IPage } from "./IPage";
import { IDiscussionBoardArticle } from "./IDiscussionBoardArticle";

export namespace IPageIDiscussionBoardArticle {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticle.ISummary[];
  };
}
