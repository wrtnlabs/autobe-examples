import { IPage } from "./IPage";
import { IShoppingMallInventoryAdjustment } from "./IShoppingMallInventoryAdjustment";

export namespace IPageIShoppingMallInventoryAdjustment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallInventoryAdjustment.ISummary[];
  };
}
