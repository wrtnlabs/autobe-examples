import { IPage } from "./IPage";
import { IDiscussionBoardAbuseReport } from "./IDiscussionBoardAbuseReport";

export namespace IPageIDiscussionBoardAbuseReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardAbuseReport.ISummary[];
  };
}
