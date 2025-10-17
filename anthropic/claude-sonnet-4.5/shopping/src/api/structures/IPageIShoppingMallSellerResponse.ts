import { IPage } from "./IPage";
import { IShoppingMallSellerResponse } from "./IShoppingMallSellerResponse";

export namespace IPageIShoppingMallSellerResponse {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerResponse.ISummary[];
  };
}
