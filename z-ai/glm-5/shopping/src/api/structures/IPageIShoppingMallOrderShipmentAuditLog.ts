import { IPage } from "./IPage";
import { IShoppingMallOrderShipmentAuditLog } from "./IShoppingMallOrderShipmentAuditLog";

export namespace IPageIShoppingMallOrderShipmentAuditLog {
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
     * @x-autobe-specification List of records of type IShoppingMallOrderShipmentAuditLog.ISummary.
     */
    data: IShoppingMallOrderShipmentAuditLog.ISummary[];
  };
}
