import { IPage } from "./IPage";
import { IDiscussionBoardArticles } from "./IDiscussionBoardArticles";

export namespace IPageIDiscussionBoardArticles {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticles.ISummary[];
  };
}
