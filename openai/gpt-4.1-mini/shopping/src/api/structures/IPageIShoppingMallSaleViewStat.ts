import { IPage } from "./IPage";
import { IShoppingMallSaleViewStat } from "./IShoppingMallSaleViewStat";

export namespace IPageIShoppingMallSaleViewStat {
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
     * @x-autobe-specification List of records of type IShoppingMallSaleViewStat.ISummary.
     */
    data: IShoppingMallSaleViewStat.ISummary[];
  };
}
