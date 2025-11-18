import { IPage } from "./IPage";
import { IShoppingMallSellerFeeCharge } from "./IShoppingMallSellerFeeCharge";

export namespace IPageIShoppingMallSellerFeeCharge {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerFeeCharge.ISummary[];
  };
}
