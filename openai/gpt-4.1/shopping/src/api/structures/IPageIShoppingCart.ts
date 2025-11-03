import { IPage } from "./IPage";
import { IShoppingCart } from "./IShoppingCart";

export namespace IPageIShoppingCart {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingCart.ISummary[];
  };
}
