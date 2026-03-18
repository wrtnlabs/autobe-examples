import { IPage } from "./IPage";
import { IShoppingMallReviewSnapshotsIndex } from "./IShoppingMallReviewSnapshotsIndex";

export namespace IPageIShoppingMallReviewSnapshotsIndex {
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
     * @x-autobe-specification List of records of type IShoppingMallReviewSnapshotIndex.ISummary.
     */
    data: IShoppingMallReviewSnapshotsIndex.ISummary[];
  };
}
