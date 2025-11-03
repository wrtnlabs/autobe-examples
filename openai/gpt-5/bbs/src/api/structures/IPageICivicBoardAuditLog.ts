import { IPage } from "./IPage";
import { ICivicBoardAuditLog } from "./ICivicBoardAuditLog";

export namespace IPageICivicBoardAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICivicBoardAuditLog.ISummary[];
  };
}
