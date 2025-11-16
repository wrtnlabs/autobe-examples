import { IPage } from "./IPage";
import { IShoppingMallCart } from "./IShoppingMallCart";

export namespace IPageIShoppingMallCart {
  /**
   * Paginated result set for platform-wide administrative search and audit of
   * customer shopping cart records.
   *
   * This object is used to return filtered, sorted, and paginated lists of
   * all active customer shopping carts, as required by administrative
   * endpoints for operational analytics, system monitoring, and compliance
   * audit. The 'pagination' property contains metadata for multi-page
   * navigation; the 'data' property holds Shopping Mall Cart summaries
   * suitable for dashboard overviews.
   *
   * Results are shaped to facilitate tracking of customer cart engagement,
   * checkout abandonment, and utilization trends at the platform level. Used
   * in administrative dashboards to support monitoring, reporting, and
   * scalable review of customer activity across the e-commerce backend.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCart.ISummary[];
  };
}
