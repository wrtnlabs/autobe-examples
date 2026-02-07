import { IPage } from "./IPage";
import { IShoppingMallSystemLog } from "./IShoppingMallSystemLog";

export namespace IPageIShoppingMallSystemLog {
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
     * @x-autobe-specification List of records of type IShoppingMallSystemLog.ISummary.
     */
    data: IShoppingMallSystemLog.ISummary[];
  };
}
