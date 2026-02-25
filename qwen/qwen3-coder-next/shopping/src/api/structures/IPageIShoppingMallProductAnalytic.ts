import { IPage } from "./IPage";
import { IShoppingMallProductAnalytic } from "./IShoppingMallProductAnalytic";

export namespace IPageIShoppingMallProductAnalytic {
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
     * @x-autobe-specification List of records of type IShoppingMallProductAnalytics.ISummary.
     */
    data: IShoppingMallProductAnalytic.ISummary[];
  };
}
