import { IPage } from "./IPage";
import { IShoppingMallPaymentMethod } from "./IShoppingMallPaymentMethod";

export namespace IPageIShoppingMallPaymentMethod {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentMethod.ISummary[];
  };
}
