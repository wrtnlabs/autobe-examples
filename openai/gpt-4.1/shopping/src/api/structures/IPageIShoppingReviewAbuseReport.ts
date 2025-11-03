import { IPage } from "./IPage";
import { IShoppingReviewAbuseReport } from "./IShoppingReviewAbuseReport";

export namespace IPageIShoppingReviewAbuseReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingReviewAbuseReport.ISummary[];
  };
}
