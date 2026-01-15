import { IPage } from "./IPage";
import { IShoppingMallPaymentIntent } from "./IShoppingMallPaymentIntent";

export namespace IPageIShoppingMallPaymentIntent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentIntent.ISummary[];
  };
}
