import { IPage } from "./IPage";
import { IShoppingMallCartItem } from "./IShoppingMallCartItem";

export namespace IPageIShoppingMallCartItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCartItem.ISummary[];
  };
}
