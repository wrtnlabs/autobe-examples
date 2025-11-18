import { IPage } from "./IPage";
import { IShoppingMallShippingPerformanceStat } from "./IShoppingMallShippingPerformanceStat";

export namespace IPageIShoppingMallShippingPerformanceStat {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShippingPerformanceStat.ISummary[];
  };
}
