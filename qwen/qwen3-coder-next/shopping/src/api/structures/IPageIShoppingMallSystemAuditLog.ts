import { IPage } from "./IPage";
import { IShoppingMallSystemAuditLog } from "./IShoppingMallSystemAuditLog";

export namespace IPageIShoppingMallSystemAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IShoppingMallSystemAuditLog.ISummary.
     */
    data: IShoppingMallSystemAuditLog.ISummary[];
  };
}
