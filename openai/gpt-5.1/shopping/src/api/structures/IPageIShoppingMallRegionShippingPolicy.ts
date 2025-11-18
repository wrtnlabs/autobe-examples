import { IPage } from "./IPage";
import { IShoppingMallRegionShippingPolicy } from "./IShoppingMallRegionShippingPolicy";

export namespace IPageIShoppingMallRegionShippingPolicy {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallRegionShippingPolicy.ISummary[];
  };
}
