import { IPage } from "./IPage";
import { IShoppingMallSellerPayoutItem } from "./IShoppingMallSellerPayoutItem";

export namespace IPageIShoppingMallSellerPayoutItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerPayoutItem.ISummary[];
  };
}
