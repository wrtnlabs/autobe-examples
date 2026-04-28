import { IEcommercePlatformSellerApprovalRequest } from "./IEcommercePlatformSellerApprovalRequest";
import { IPage } from "./IPage";

export namespace IPageIEcommercePlatformSellerApprovalRequest {
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
         *   IEcommercePlatformSellerApprovalRequest.ISummary.
     */
    data: IEcommercePlatformSellerApprovalRequest.ISummary[];
  };
}
