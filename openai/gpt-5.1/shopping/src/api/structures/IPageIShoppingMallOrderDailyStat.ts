import { IPage } from "./IPage";
import { IShoppingMallOrderDailyStat } from "./IShoppingMallOrderDailyStat";

export namespace IPageIShoppingMallOrderDailyStat {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderDailyStat.ISummary[];
  };
}
