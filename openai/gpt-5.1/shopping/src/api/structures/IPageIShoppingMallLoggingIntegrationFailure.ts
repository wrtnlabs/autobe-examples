import { IPage } from "./IPage";
import { IShoppingMallLoggingIntegrationFailure } from "./IShoppingMallLoggingIntegrationFailure";

export namespace IPageIShoppingMallLoggingIntegrationFailure {
  /**
   * Paginated collection of integration failure incident summaries in the
   * ShoppingMall platform.
   *
   * This wrapper combines page-level navigation information with a list of
   * `IShoppingMallLoggingIntegrationFailure.ISummary` records returned by the
   * `/shoppingMall/platformAdmin/reports/logging/integrationFailures`
   * reporting endpoint. Platform administrators use this structure to browse,
   * slice, and analyze failed external integrations—such as payment gateways,
   * shipping carriers, and notification providers—while keeping responses
   * bounded and efficient for both clients and the underlying logging and
   * analytics infrastructure.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the integration failure incident report.
     *
     * This object follows the `IPage.IPagination` schema and exposes the
     * current page index, page-size limit, total record count, and total
     * number of pages. It allows administrative UIs and reporting tools to
     * navigate large volumes of integration failure logs in a controlled
     * way, avoiding unbounded scans against logging storage while still
     * providing full visibility over time.
     */
    pagination: IPage.IPagination;

    /**
     * List of integration failure incident summaries for the current page.
     *
     * Each element is an `IShoppingMallLoggingIntegrationFailure.ISummary`
     * DTO that represents a single failed or degraded interaction with an
     * external system, aggregated from log sources such as
     * `shopping_mall_integration_event_logs` and
     * `shopping_mall_error_logs`. This collection is ordered and filtered
     * according to the search criteria provided in
     * `IShoppingMallLoggingIntegrationFailure.IRequest`, and is intended
     * for use in administrative dashboards, SLA tracking views, and
     * incident investigation workflows.
     */
    data: IShoppingMallLoggingIntegrationFailure.ISummary[];
  };
}
