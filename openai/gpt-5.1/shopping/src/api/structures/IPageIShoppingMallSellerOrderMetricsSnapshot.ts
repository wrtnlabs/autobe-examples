import { IPage } from "./IPage";
import { IShoppingMallSellerOrderMetricsSnapshot } from "./IShoppingMallSellerOrderMetricsSnapshot";

export namespace IPageIShoppingMallSellerOrderMetricsSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerOrderMetricsSnapshot.ISummary[];
  };
}
