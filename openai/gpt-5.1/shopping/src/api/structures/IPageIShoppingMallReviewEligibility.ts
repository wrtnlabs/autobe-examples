import { IPage } from "./IPage";
import { IShoppingMallReviewEligibility } from "./IShoppingMallReviewEligibility";

export namespace IPageIShoppingMallReviewEligibility {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewEligibility.ISummary[];
  };
}
