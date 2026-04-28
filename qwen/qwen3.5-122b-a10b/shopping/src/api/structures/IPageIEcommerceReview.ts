import { IEcommerceReview } from "./IEcommerceReview";
import { IPage } from "./IPage";

export namespace IPageIEcommerceReview {
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
         *   IEcommerceReview.ISummary.
     */
    data: IEcommerceReview.ISummary[];
  };
}
