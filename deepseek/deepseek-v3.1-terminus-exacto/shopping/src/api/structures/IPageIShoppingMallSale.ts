import { IPage } from "./IPage";
import { IShoppingMallSale } from "./IShoppingMallSale";

export namespace IPageIShoppingMallSale {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSale.ISummary[];
  };
}
