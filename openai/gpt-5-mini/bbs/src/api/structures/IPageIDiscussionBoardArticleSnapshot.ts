import { IPage } from "./IPage";
import { IDiscussionBoardArticleSnapshot } from "./IDiscussionBoardArticleSnapshot";

export namespace IPageIDiscussionBoardArticleSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleSnapshot.ISummary[];
  };
}
