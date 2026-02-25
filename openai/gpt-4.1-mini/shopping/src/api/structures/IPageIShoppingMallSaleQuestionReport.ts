import { IPage } from "./IPage";
import { IShoppingMallSaleQuestionReport } from "./IShoppingMallSaleQuestionReport";

export namespace IPageIShoppingMallSaleQuestionReport {
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
     * @x-autobe-specification List of records of type IShoppingMallSaleQuestionReport.ISummary.
     */
    data: IShoppingMallSaleQuestionReport.ISummary[];
  };
}
