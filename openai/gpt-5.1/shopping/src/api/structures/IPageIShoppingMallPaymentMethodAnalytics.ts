import { IPage } from "./IPage";
import { IShoppingMallPaymentMethodAnalytics } from "./IShoppingMallPaymentMethodAnalytics";

export namespace IPageIShoppingMallPaymentMethodAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentMethodAnalytics.ISummary[];
  };
}
