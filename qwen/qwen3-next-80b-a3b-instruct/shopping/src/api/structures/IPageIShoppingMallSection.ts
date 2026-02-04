import { IPage } from "./IPage";
import { IShoppingMallSection } from "./IShoppingMallSection";

export namespace IPageIShoppingMallSection {
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
     * @x-autobe-specification List of records of type IShoppingMallSection.ISummary.
     */
    data: IShoppingMallSection.ISummary[];
  };
}
