import { IPage } from "./IPage";
import { IDiscussionBoardArticleStatus } from "./IDiscussionBoardArticleStatus";

export namespace IPageIDiscussionBoardArticleStatus {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleStatus.ISummary[];
  };
}
