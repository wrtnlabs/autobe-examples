import { IPage } from "./IPage";
import { IShoppingCartItem } from "./IShoppingCartItem";

export namespace IPageIShoppingCartItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingCartItem.ISummary[];
  };
}
