import { IPage } from "./IPage";
import { IShoppingOrderSplit } from "./IShoppingOrderSplit";

export namespace IPageIShoppingOrderSplit {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingOrderSplit.ISummary[];
  };
}
