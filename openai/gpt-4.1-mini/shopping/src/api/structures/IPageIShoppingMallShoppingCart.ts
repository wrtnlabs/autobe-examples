import { IPage } from "./IPage";
import { IShoppingMallShoppingCart } from "./IShoppingMallShoppingCart";

export namespace IPageIShoppingMallShoppingCart {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShoppingCart.ISummary[];
  };
}
