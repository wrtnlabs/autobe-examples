import { IPage } from "./IPage";
import { IShoppingMallInventoryAdjustmentReason } from "./IShoppingMallInventoryAdjustmentReason";

export namespace IPageIShoppingMallInventoryAdjustmentReason {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallInventoryAdjustmentReason.ISummary[];
  };
}
