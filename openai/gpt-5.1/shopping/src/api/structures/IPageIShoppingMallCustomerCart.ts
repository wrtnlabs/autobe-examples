import { IPage } from "./IPage";
import { IShoppingMallCustomerCart } from "./IShoppingMallCustomerCart";

export namespace IPageIShoppingMallCustomerCart {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCustomerCart.ISummary[];
  };
}
