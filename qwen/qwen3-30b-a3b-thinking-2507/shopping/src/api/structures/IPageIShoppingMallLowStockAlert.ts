import { IPage } from "./IPage";
import { IShoppingMallLowStockAlert } from "./IShoppingMallLowStockAlert";

export namespace IPageIShoppingMallLowStockAlert {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallLowStockAlert.ISummary[];
  };
}
