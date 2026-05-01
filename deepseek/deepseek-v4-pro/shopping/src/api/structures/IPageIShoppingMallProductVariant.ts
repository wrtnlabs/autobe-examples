import { IPage } from "./IPage";
import { IShoppingMallProductVariant } from "./IShoppingMallProductVariant";

export namespace IPageIShoppingMallProductVariant {
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
         * @x-autobe-specification List of records of type
         *   IShoppingMallProductVariant.ISummary.
     */
    data: IShoppingMallProductVariant.ISummary[];
  };
}
