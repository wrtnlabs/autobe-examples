import { IPage } from "./IPage";
import { IDiscussionBoardArticleCategory } from "./IDiscussionBoardArticleCategory";

export namespace IPageIDiscussionBoardArticleCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleCategory.ISummary[];
  };
}
