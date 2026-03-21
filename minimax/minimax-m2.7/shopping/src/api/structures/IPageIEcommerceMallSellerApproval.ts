import { IEcommerceMallSellerApproval } from "./IEcommerceMallSellerApproval";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallSellerApproval {
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
     * @x-autobe-specification List of records of type IEcommerceMallSellerApproval.ISummary.
     */
    data: IEcommerceMallSellerApproval.ISummary[];
  };
}
