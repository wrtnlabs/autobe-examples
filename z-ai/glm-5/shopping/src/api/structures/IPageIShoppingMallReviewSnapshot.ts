import { IPage } from "./IPage";
import { IShoppingMallReviewSnapshot } from "./IShoppingMallReviewSnapshot";

export namespace IPageIShoppingMallReviewSnapshot {
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
         *   IShoppingMallReviewSnapshot.ISummary.
     */
    data: IShoppingMallReviewSnapshot.ISummary[];
  };
}
