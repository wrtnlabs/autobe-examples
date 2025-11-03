import { IPage } from "./IPage";
import { IShoppingCustomer } from "./IShoppingCustomer";

export namespace IPageIShoppingCustomer {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingCustomer.ISummary[];
  };
}
