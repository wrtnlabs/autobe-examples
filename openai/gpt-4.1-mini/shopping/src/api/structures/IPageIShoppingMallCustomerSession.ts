import { IPage } from "./IPage";
import { IShoppingMallCustomerSession } from "./IShoppingMallCustomerSession";

export namespace IPageIShoppingMallCustomerSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCustomerSession.ISummary[];
  };
}
