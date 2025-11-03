import { IPage } from "./IPage";
import { IShoppingMallSellerProfile } from "./IShoppingMallSellerProfile";

export namespace IPageIShoppingMallSellerProfile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerProfile.ISummary[];
  };
}
