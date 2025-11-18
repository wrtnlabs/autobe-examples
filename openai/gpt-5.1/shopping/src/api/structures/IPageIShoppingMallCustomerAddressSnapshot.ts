import { IPage } from "./IPage";
import { IShoppingMallCustomerAddressSnapshot } from "./IShoppingMallCustomerAddressSnapshot";

export namespace IPageIShoppingMallCustomerAddressSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCustomerAddressSnapshot.ISummary[];
  };
}
