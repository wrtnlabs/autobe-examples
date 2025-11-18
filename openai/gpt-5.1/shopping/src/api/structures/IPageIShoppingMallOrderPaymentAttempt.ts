import { IPage } from "./IPage";
import { IShoppingMallOrderPaymentAttempt } from "./IShoppingMallOrderPaymentAttempt";

export namespace IPageIShoppingMallOrderPaymentAttempt {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderPaymentAttempt.ISummary[];
  };
}
