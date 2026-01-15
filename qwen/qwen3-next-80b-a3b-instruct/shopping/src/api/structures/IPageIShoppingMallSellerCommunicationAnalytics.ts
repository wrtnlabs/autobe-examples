import { IPage } from "./IPage";
import { IShoppingMallSellerCommunicationAnalytics } from "./IShoppingMallSellerCommunicationAnalytics";

export namespace IPageIShoppingMallSellerCommunicationAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSellerCommunicationAnalytics.ISummary[];
  };
}
