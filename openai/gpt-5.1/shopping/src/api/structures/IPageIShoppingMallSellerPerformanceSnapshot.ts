import { IPage } from "./IPage";
import { IShoppingMallSellerPerformanceSnapshot } from "./IShoppingMallSellerPerformanceSnapshot";

export namespace IPageIShoppingMallSellerPerformanceSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerPerformanceSnapshot.ISummary[];
  };
}
