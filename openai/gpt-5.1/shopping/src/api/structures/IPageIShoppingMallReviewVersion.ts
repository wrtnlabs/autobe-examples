import { IPage } from "./IPage";
import { IShoppingMallReviewVersion } from "./IShoppingMallReviewVersion";

export namespace IPageIShoppingMallReviewVersion {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewVersion.ISummary[];
  };
}
