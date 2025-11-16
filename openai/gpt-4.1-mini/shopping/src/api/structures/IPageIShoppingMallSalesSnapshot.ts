import { IPage } from "./IPage";
import { IShoppingMallSalesSnapshot } from "./IShoppingMallSalesSnapshot";

export namespace IPageIShoppingMallSalesSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSalesSnapshot.ISummary[];
  };
}
