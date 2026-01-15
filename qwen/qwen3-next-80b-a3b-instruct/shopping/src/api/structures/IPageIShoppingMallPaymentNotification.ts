import { IPage } from "./IPage";
import { IShoppingMallPaymentNotification } from "./IShoppingMallPaymentNotification";

export namespace IPageIShoppingMallPaymentNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentNotification.ISummary[];
  };
}
