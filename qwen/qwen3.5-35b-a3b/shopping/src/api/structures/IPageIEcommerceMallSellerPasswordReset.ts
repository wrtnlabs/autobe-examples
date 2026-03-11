import { IEcommerceMallSellerPasswordReset } from "./IEcommerceMallSellerPasswordReset";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallSellerPasswordReset {
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
     * @x-autobe-specification List of records of type IEcommerceMallSellerPasswordReset.ISummary.
     */
    data: IEcommerceMallSellerPasswordReset.ISummary[];
  };
}
