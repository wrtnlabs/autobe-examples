import { IEcommerceSellerPasswordReset } from "./IEcommerceSellerPasswordReset";
import { IPage } from "./IPage";

export namespace IPageIEcommerceSellerPasswordReset {
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
     * @x-autobe-specification List of records of type IEcommerceSellerPasswordReset.ISummary.
     */
    data: IEcommerceSellerPasswordReset.ISummary[];
  };
}
