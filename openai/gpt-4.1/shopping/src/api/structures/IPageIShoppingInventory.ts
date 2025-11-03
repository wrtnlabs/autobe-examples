import { IPage } from "./IPage";
import { IShoppingInventory } from "./IShoppingInventory";

export namespace IPageIShoppingInventory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingInventory.ISummary[];
  };
}
