import { IPage } from "./IPage";
import { IDiscussionBoardContentReport } from "./IDiscussionBoardContentReport";

export namespace IPageIDiscussionBoardContentReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardContentReport.ISummary[];
  };
}
