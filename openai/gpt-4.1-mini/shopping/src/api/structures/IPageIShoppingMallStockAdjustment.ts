import { IPage } from "./IPage";
import { IShoppingMallStockAdjustment } from "./IShoppingMallStockAdjustment";

export namespace IPageIShoppingMallStockAdjustment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallStockAdjustment.ISummary[];
  };
}
