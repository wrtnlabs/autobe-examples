import { IPage } from "./IPage";
import { IShoppingMallReviewModeration } from "./IShoppingMallReviewModeration";

export namespace IPageIShoppingMallReviewModeration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewModeration.ISummary[];
  };
}
