import { IPage } from "./IPage";
import { IShoppingMallPaymentRefundItem } from "./IShoppingMallPaymentRefundItem";

export namespace IPageIShoppingMallPaymentRefundItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentRefundItem.ISummary[];
  };
}
