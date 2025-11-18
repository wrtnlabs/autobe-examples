import { IPage } from "./IPage";
import { IShoppingMallSellerDailyStat } from "./IShoppingMallSellerDailyStat";

export namespace IPageIShoppingMallSellerDailyStat {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerDailyStat.ISummary[];
  };
}
