import { IPage } from "./IPage";
import { IShoppingMallIntegrationEventLog } from "./IShoppingMallIntegrationEventLog";

export namespace IPageIShoppingMallIntegrationEventLog {
  /**
   * Paginated collection of integration event log summaries for
   * administrative observability.
   *
   * This schema wraps a list of `IShoppingMallIntegrationEventLog.ISummary`
   * records together with `IPage.IPagination` metadata to support efficient
   * paging over large volumes of integration log data stored in the
   * `shopping_mall_integration_event_logs` table. It is used as the response
   * body for the `PATCH /shoppingMall/platformAdmin/integrationEventLogs`
   * endpoint, which allows platformAdmin actors to search, filter, and page
   * through historical interactions with external providers and
   * infrastructure services without retrieving all records at once.
   */
  export type ISummary = {
    /**
     * Pagination state for the current slice of integration event log
     * summaries.
     *
     * This object follows the shared `IPage.IPagination` contract and
     * carries information such as the current page index, page size, total
     * number of log records that matched the filter criteria, and the total
     * number of pages. Monitoring dashboards and admin tools use this
     * information to render navigation controls and to understand how large
     * the result set is when browsing integration logs from the
     * `shopping_mall_integration_event_logs` table.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of integration event log summary records for the current
     * page.
     *
     * Each element is an `IShoppingMallIntegrationEventLog.ISummary`
     * instance that represents a single row from the
     * `shopping_mall_integration_event_logs` Prisma model, projected into a
     * lightweight form optimized for list and dashboard views. These
     * summaries surface key fields such as identifiers, provider type and
     * name, event type, direction, status, latency, HTTP status code, and
     * timestamps so that platform administrators can quickly scan
     * integration behavior without loading full detail payloads for every
     * record.
     */
    data: IShoppingMallIntegrationEventLog.ISummary[];
  };
}
