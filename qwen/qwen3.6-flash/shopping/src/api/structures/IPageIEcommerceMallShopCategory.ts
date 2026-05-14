import { IEcommerceMallShopCategory } from "./IEcommerceMallShopCategory";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallShopCategory {
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
         *   IEcommerceMallShopCategory.ISummary.
     */
    data: IEcommerceMallShopCategory.ISummary[];
  };
}
