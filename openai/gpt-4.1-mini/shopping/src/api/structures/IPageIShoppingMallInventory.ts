import { IPage } from "./IPage";
import { IShoppingMallInventory } from "./IShoppingMallInventory";

export namespace IPageIShoppingMallInventory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallInventory.ISummary[];
  };
}
