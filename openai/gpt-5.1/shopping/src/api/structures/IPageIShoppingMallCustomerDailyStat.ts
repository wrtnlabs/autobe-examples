import { IPage } from "./IPage";
import { IShoppingMallCustomerDailyStat } from "./IShoppingMallCustomerDailyStat";

export namespace IPageIShoppingMallCustomerDailyStat {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCustomerDailyStat.ISummary[];
  };
}
