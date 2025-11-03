import { IPage } from "./IPage";
import { IShoppingReview } from "./IShoppingReview";

export namespace IPageIShoppingReview {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingReview.ISummary[];
  };
}
