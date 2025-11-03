import { IPage } from "./IPage";
import { IShoppingOrder } from "./IShoppingOrder";

export namespace IPageIShoppingOrder {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingOrder.ISummary[];
  };
}
