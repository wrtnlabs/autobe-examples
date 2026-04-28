import { IPage } from "./IPage";
import { IShoppingMallSellerApproval } from "./IShoppingMallSellerApproval";

export namespace IPageIShoppingMallSellerApproval {
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
         *   IShoppingMallSellerApproval.ISummary.
     */
    data: IShoppingMallSellerApproval.ISummary[];
  };
}
