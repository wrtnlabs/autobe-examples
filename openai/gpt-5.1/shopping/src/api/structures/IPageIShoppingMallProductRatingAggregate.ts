import { IPage } from "./IPage";
import { IShoppingMallProductRatingAggregate } from "./IShoppingMallProductRatingAggregate";

export namespace IPageIShoppingMallProductRatingAggregate {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductRatingAggregate.ISummary[];
  };
}
