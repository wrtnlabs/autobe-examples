import { IEcommerceReviewFlag } from "./IEcommerceReviewFlag";
import { IPage } from "./IPage";

export namespace IPageIEcommerceReviewFlag {
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
     * @x-autobe-specification List of records of type IEcommerceReviewFlag.ISummary.
     */
    data: IEcommerceReviewFlag.ISummary[];
  };
}
