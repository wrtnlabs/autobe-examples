import { IPage } from "./IPage";
import { IShoppingMallCouponUsage } from "./IShoppingMallCouponUsage";

export namespace IPageIShoppingMallCouponUsage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCouponUsage.ISummary[];
  };
}
