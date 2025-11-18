import { IPage } from "./IPage";
import { IShoppingMallShippingPerformanceAnalytics } from "./IShoppingMallShippingPerformanceAnalytics";

export namespace IPageIShoppingMallShippingPerformanceAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShippingPerformanceAnalytics.ISummary[];
  };
}
