import { IPage } from "./IPage";
import { IShoppingMallSellerSubscriptionPlan } from "./IShoppingMallSellerSubscriptionPlan";

export namespace IPageIShoppingMallSellerSubscriptionPlan {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerSubscriptionPlan.ISummary[];
  };
}
