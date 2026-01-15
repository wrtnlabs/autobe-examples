import { IPage } from "./IPage";
import { IDiscussionBoardArticleMonthlyStats } from "./IDiscussionBoardArticleMonthlyStats";

export namespace IPageIDiscussionBoardArticleMonthlyStats {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleMonthlyStats.ISummary[];
  };
}
