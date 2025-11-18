import { IPage } from "./IPage";
import { IShoppingMallCustomerAddress } from "./IShoppingMallCustomerAddress";

export namespace IPageIShoppingMallCustomerAddress {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCustomerAddress.ISummary[];
  };
}
