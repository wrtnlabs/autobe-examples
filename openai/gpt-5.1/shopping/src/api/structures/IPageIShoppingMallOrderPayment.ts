import { IPage } from "./IPage";
import { IShoppingMallOrderPayment } from "./IShoppingMallOrderPayment";

export namespace IPageIShoppingMallOrderPayment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderPayment.ISummary[];
  };
}
