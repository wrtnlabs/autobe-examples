import { IPage } from "./IPage";
import { ICommunityBbsAuditLog } from "./ICommunityBbsAuditLog";

export namespace IPageICommunityBbsAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsAuditLog.ISummary[];
  };
}
