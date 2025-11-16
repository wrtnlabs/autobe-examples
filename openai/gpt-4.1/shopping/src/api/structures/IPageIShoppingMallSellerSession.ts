import { IPage } from "./IPage";
import { IShoppingMallSellerSession } from "./IShoppingMallSellerSession";

export namespace IPageIShoppingMallSellerSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerSession.ISummary[];
  };
}
