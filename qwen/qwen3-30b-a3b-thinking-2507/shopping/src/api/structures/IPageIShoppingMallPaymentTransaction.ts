import { IPage } from "./IPage";
import { IShoppingMallPaymentTransaction } from "./IShoppingMallPaymentTransaction";

export namespace IPageIShoppingMallPaymentTransaction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentTransaction.ISummary[];
  };
}
