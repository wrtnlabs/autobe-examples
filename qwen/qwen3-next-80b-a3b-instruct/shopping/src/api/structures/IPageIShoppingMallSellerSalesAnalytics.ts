import { IPage } from "./IPage";
import { IShoppingMallSellerSalesAnalytics } from "./IShoppingMallSellerSalesAnalytics";

export namespace IPageIShoppingMallSellerSalesAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerSalesAnalytics.ISummary[];
  };
}
