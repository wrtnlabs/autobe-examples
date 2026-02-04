import { IPage } from "./IPage";
import { IShoppingMallCart } from "./IShoppingMallCart";

export namespace IPageIShoppingMallCart {
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
     * @x-autobe-specification List of records of type IShoppingMallCart.ISummary.
     */
    data: IShoppingMallCart.ISummary[];
  };
}
