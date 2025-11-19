import { IPage } from "./IPage";
import { IDiscussionBoardModeratorAuditLog } from "./IDiscussionBoardModeratorAuditLog";

export namespace IPageIDiscussionBoardModeratorAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardModeratorAuditLog.ISummary[];
  };
}
