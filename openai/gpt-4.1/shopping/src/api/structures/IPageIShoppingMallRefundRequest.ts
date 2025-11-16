import { IPage } from "./IPage";
import { IShoppingMallRefundRequest } from "./IShoppingMallRefundRequest";

export namespace IPageIShoppingMallRefundRequest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallRefundRequest.ISummary[];
  };
}
