import { IPage } from "./IPage";
import { IShoppingMallOrderItem } from "./IShoppingMallOrderItem";

export namespace IPageIShoppingMallOrderItem {
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
     * @x-autobe-specification List of records of type IShoppingMallOrderItem.ISummary.
     */
    data: IShoppingMallOrderItem.ISummary[];
  };
}
