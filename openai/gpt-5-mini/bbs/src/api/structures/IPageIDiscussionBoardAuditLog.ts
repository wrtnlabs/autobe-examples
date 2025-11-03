import { IPage } from "./IPage";
import { IDiscussionBoardAuditLog } from "./IDiscussionBoardAuditLog";

export namespace IPageIDiscussionBoardAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardAuditLog.ISummary[];
  };
}
