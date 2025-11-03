import { IPage } from "./IPage";
import { IShoppingAuditLog } from "./IShoppingAuditLog";

export namespace IPageIShoppingAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingAuditLog.ISummary[];
  };
}
