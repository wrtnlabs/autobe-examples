import { IPage } from "./IPage";
import { IShoppingMallSellerPerformanceMetrics } from "./IShoppingMallSellerPerformanceMetrics";

export namespace IPageIShoppingMallSellerPerformanceMetrics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerPerformanceMetrics.ISummary[];
  };
}
