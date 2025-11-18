import { IPage } from "./IPage";
import { IShoppingMallRefundAndDisputeStat } from "./IShoppingMallRefundAndDisputeStat";

export namespace IPageIShoppingMallRefundAndDisputeStat {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallRefundAndDisputeStat.ISummary[];
  };
}
