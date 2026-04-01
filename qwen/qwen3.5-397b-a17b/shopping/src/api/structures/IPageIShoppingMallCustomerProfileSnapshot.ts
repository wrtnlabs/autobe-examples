import { IPage } from "./IPage";
import { IShoppingMallCustomerProfileSnapshot } from "./IShoppingMallCustomerProfileSnapshot";

export namespace IPageIShoppingMallCustomerProfileSnapshot {
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
     * @x-autobe-specification List of records of type IShoppingMallCustomerProfileSnapshot.ISummary.
     */
    data: IShoppingMallCustomerProfileSnapshot.ISummary[];
  };
}
