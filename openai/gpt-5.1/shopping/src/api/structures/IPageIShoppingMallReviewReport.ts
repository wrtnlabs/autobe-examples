import { IPage } from "./IPage";
import { IShoppingMallReviewReport } from "./IShoppingMallReviewReport";

export namespace IPageIShoppingMallReviewReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewReport.ISummary[];
  };
}
