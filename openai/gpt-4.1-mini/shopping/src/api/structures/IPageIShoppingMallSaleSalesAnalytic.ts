import { IPage } from "./IPage";
import { IShoppingMallSaleSalesAnalytic } from "./IShoppingMallSaleSalesAnalytic";

export namespace IPageIShoppingMallSaleSalesAnalytic {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IResponse = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IShoppingMallSaleSalesAnalytic.IResponse.
     */
    data: IShoppingMallSaleSalesAnalytic.IResponse[];
  };

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
     * @x-autobe-specification List of records of type IShoppingMallSaleSalesAnalytic.ISummary.
     */
    data: IShoppingMallSaleSalesAnalytic.ISummary[];
  };
}
