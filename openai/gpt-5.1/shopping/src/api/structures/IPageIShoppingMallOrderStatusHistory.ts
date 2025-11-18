import { IPage } from "./IPage";
import { IShoppingMallOrderStatusHistory } from "./IShoppingMallOrderStatusHistory";

export namespace IPageIShoppingMallOrderStatusHistory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderStatusHistory.ISummary[];
  };
}
