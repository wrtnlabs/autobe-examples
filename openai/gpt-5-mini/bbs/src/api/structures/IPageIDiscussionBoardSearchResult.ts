import { IPage } from "./IPage";
import { IDiscussionBoardSearchResult } from "./IDiscussionBoardSearchResult";

export namespace IPageIDiscussionBoardSearchResult {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardSearchResult.ISummary[];
  };
}
