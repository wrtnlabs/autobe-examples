import { IPage } from "./IPage";
import { IShoppingMallOrder } from "./IShoppingMallOrder";

export namespace IPageIShoppingMallOrder {
  /**
   * Paginated shopping mall order summary results for business analytics,
   * search, and management dashboard use cases.
   *
   * Each instance wraps a set of condensed order summary records with
   * concrete pagination and navigation metadata, optimized for performance in
   * high-volume management and customer support contexts. Guarantees presence
   * of both page information and result data array even on empty result
   * sets.
   *
   * This wrapper enhances uniformity and reusability across service
   * interfaces, management dashboards, export flows, automated batch queries,
   * and reporting APIs.
   */
  export type ISummary = {
    /**
     * Pagination information for this batch of order summary results. This
     * object includes required details about page number, size, record
     * count, and navigation in the context of advanced order search within
     * business management and analytics workflows. The IPage.IPagination
     * structure ensures cross-service interoperability for dashboard and
     * report rendering, and supports efficient, large-scale paginated data
     * operations.
     *
     * Always present; never null or omitted. May be used in conjunction
     * with client filtering and data export scenarios.
     */
    pagination: IPage.IPagination;

    /**
     * Array of summary order DTO records resulting from a paginated search
     * or filter operation. Each element is a platform-compliant
     * IShoppingMallOrder.ISummary representing a single customer order in
     * condensed but information-rich form for administration, analytics,
     * and management user interface workflows.
     *
     * Never null or omitted; empty if no results matched. Used for admin
     * listing, business analytics, export, dashboard widget population, or
     * customer service back office views.
     */
    data: IShoppingMallOrder.ISummary[];
  };
}
