import { IPage } from "./IPage";
import { IShoppingMallReviewComment } from "./IShoppingMallReviewComment";

export namespace IPageIShoppingMallReviewComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewComment.ISummary[];
  };
}
