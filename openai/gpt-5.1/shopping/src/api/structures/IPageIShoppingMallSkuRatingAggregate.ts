import { IPage } from "./IPage";
import { IShoppingMallSkuRatingAggregate } from "./IShoppingMallSkuRatingAggregate";

export namespace IPageIShoppingMallSkuRatingAggregate {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSkuRatingAggregate.ISummary[];
  };
}
