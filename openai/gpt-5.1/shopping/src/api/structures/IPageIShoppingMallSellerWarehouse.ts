import { IPage } from "./IPage";
import { IShoppingMallSellerWarehouse } from "./IShoppingMallSellerWarehouse";

export namespace IPageIShoppingMallSellerWarehouse {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerWarehouse.ISummary[];
  };
}
