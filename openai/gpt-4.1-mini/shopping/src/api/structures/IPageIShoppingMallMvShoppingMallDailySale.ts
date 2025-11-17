import { IPage } from "./IPage";
import { IShoppingMallMvShoppingMallDailySale } from "./IShoppingMallMvShoppingMallDailySale";

export namespace IPageIShoppingMallMvShoppingMallDailySale {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallMvShoppingMallDailySale.ISummary[];
  };
}
