import { IPage } from "./IPage";
import { IShoppingMallInventoryLog } from "./IShoppingMallInventoryLog";

export namespace IPageIShoppingMallInventoryLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallInventoryLog.ISummary[];
  };
}
