import { IPage } from "./IPage";
import { IShoppingMallReviewModerationAction } from "./IShoppingMallReviewModerationAction";

export namespace IPageIShoppingMallReviewModerationAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewModerationAction.ISummary[];
  };
}
