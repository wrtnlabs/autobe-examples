import { IPage } from "./IPage";
import { IShoppingMallOrderRefund } from "./IShoppingMallOrderRefund";

export namespace IPageIShoppingMallOrderRefund {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderRefund.ISummary[];
  };
}
