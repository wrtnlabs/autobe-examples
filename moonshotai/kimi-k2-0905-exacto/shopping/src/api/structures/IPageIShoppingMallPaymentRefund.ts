import { IPage } from "./IPage";
import { IShoppingMallPaymentRefund } from "./IShoppingMallPaymentRefund";

export namespace IPageIShoppingMallPaymentRefund {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentRefund.ISummary[];
  };
}
