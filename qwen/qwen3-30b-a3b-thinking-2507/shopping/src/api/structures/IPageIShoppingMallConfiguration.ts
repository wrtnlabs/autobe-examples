import { IPage } from "./IPage";
import { IShoppingMallConfiguration } from "./IShoppingMallConfiguration";

export namespace IPageIShoppingMallConfiguration {
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
     * @x-autobe-specification List of records of type IShoppingMallConfiguration.ISummary.
     */
    data: IShoppingMallConfiguration.ISummary[];
  };
}
