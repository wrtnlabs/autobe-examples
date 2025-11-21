import { IPage } from "./IPage";
import { IShoppingMallInventoryLevels } from "./IShoppingMallInventoryLevels";

export namespace IPageIShoppingMallInventoryLevels {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallInventoryLevels.ISummary[];
  };
}
