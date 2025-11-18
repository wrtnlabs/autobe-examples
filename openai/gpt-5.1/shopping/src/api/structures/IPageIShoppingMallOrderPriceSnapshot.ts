import { IPage } from "./IPage";
import { IShoppingMallOrderPriceSnapshot } from "./IShoppingMallOrderPriceSnapshot";

export namespace IPageIShoppingMallOrderPriceSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderPriceSnapshot.ISummary[];
  };
}
