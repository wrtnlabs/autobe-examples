import { IPage } from "./IPage";
import { IShoppingOrderLine } from "./IShoppingOrderLine";

export namespace IPageIShoppingOrderLine {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingOrderLine.ISummary[];
  };
}
