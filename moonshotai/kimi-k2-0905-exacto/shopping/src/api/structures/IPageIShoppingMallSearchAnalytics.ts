import { IPage } from "./IPage";
import { IShoppingMallSearchAnalytics } from "./IShoppingMallSearchAnalytics";

export namespace IPageIShoppingMallSearchAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSearchAnalytics.ISummary[];
  };
}
