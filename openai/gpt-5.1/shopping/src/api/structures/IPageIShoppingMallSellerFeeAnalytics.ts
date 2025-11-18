import { IPage } from "./IPage";
import { IShoppingMallSellerFeeAnalytics } from "./IShoppingMallSellerFeeAnalytics";

export namespace IPageIShoppingMallSellerFeeAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerFeeAnalytics.ISummary[];
  };
}
