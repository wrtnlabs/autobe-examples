import { IPage } from "./IPage";
import { IShoppingMallReviewModerationQueue } from "./IShoppingMallReviewModerationQueue";

export namespace IPageIShoppingMallReviewModerationQueue {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewModerationQueue.ISummary[];
  };
}
