import { IPage } from "./IPage";
import { IDiscussionBoardReport } from "./IDiscussionBoardReport";

export namespace IPageIDiscussionBoardReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardReport.ISummary[];
  };
}
