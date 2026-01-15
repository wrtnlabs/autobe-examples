import { IPage } from "./IPage";
import { IShoppingMallReviewModerationLog } from "./IShoppingMallReviewModerationLog";

export namespace IPageIShoppingMallReviewModerationLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewModerationLog.ISummary[];
  };
}
