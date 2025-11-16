import { IPage } from "./IPage";
import { IShoppingMallCouponRedemption } from "./IShoppingMallCouponRedemption";

export namespace IPageIShoppingMallCouponRedemption {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCouponRedemption.ISummary[];
  };
}
