import { IPage } from "./IPage";
import { IShoppingMallInventoryUnit } from "./IShoppingMallInventoryUnit";

export namespace IPageIShoppingMallInventoryUnit {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallInventoryUnit.ISummary[];
  };
}
