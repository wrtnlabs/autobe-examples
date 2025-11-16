import { IPage } from "./IPage";
import { IShoppingMallLoggingPerformanceIncident } from "./IShoppingMallLoggingPerformanceIncident";

export namespace IPageIShoppingMallLoggingPerformanceIncident {
  /**
   * Paginated list of performance incident summaries derived from
   * ShoppingMall logging data.
   *
   * This schema is the response envelope for the `PATCH
   * /shoppingMall/platformAdmin/reports/logging/performanceIncidents`
   * endpoint. It combines paging metadata (`IPage.IPagination`) with a list
   * of `IShoppingMallLoggingPerformanceIncident.ISummary` records so that
   * platform administrators can efficiently browse and analyze
   * performance-related incidents, such as slow responses, timeouts, and
   * error spikes, without loading the full underlying log streams at once.
   */
  export type ISummary = {
    /**
     * Pagination information describing the current window of performance
     * incident summaries.
     *
     * This object conforms to the shared `IPage.IPagination` structure and
     * includes fields such as current page number, page size, total
     * incident count matching the filters, and total number of pages. It is
     * used by admin-facing monitoring UIs to drive navigation over
     * potentially large time-series datasets of performance incidents
     * aggregated from logging tables.
     */
    pagination: IPage.IPagination;

    /**
     * Array of performance incident summary records for the current page.
     *
     * Each element is an `IShoppingMallLoggingPerformanceIncident.ISummary`
     * object that represents a single detected performance incident,
     * typically aggregated from log-oriented Prisma models such as
     * `shopping_mall_error_logs`, `shopping_mall_access_logs`, and
     * `shopping_mall_integration_event_logs`. These summaries expose key
     * diagnostics such as detection time, severity, category, affected
     * service or endpoint, and metric values, enabling platform
     * administrators to review and triage incidents directly from reporting
     * dashboards.
     */
    data: IShoppingMallLoggingPerformanceIncident.ISummary[];
  };
}
