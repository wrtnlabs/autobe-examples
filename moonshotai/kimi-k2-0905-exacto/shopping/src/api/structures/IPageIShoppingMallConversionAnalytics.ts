import { IPage } from "./IPage";
import { IShoppingMallConversionAnalytics } from "./IShoppingMallConversionAnalytics";

export namespace IPageIShoppingMallConversionAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallConversionAnalytics.ISummary[];
  };
}
