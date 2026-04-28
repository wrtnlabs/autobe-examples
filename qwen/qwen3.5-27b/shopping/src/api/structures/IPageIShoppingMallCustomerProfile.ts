import { IPage } from "./IPage";
import { IShoppingMallCustomerProfile } from "./IShoppingMallCustomerProfile";

export namespace IPageIShoppingMallCustomerProfile {
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
         *   IShoppingMallCustomerProfile.ISummary.
     */
    data: IShoppingMallCustomerProfile.ISummary[];
  };
}
