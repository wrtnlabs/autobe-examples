import { IPage } from "./IPage";
import { IShoppingAdminActionLog } from "./IShoppingAdminActionLog";

export namespace IPageIShoppingAdminActionLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingAdminActionLog.ISummary[];
  };
}
