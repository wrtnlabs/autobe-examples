import { IPage } from "./IPage";
import { IShoppingMallSellerEarning } from "./IShoppingMallSellerEarning";

export namespace IPageIShoppingMallSellerEarning {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerEarning.ISummary[];
  };
}
