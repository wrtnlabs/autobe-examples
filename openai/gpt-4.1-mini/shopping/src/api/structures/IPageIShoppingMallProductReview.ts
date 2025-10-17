import { IPage } from "./IPage";
import { IShoppingMallProductReview } from "./IShoppingMallProductReview";

export namespace IPageIShoppingMallProductReview {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductReview.ISummary[];
  };
}
