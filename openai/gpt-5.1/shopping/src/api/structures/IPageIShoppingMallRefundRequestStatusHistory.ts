import { IPage } from "./IPage";
import { IShoppingMallRefundRequestStatusHistory } from "./IShoppingMallRefundRequestStatusHistory";

export namespace IPageIShoppingMallRefundRequestStatusHistory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallRefundRequestStatusHistory.ISummary[];
  };
}
