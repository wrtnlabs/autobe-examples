import { IPage } from "./IPage";
import { IDiscussionBoardAuditLogAccess } from "./IDiscussionBoardAuditLogAccess";

export namespace IPageIDiscussionBoardAuditLogAccess {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardAuditLogAccess.ISummary[];
  };
}
