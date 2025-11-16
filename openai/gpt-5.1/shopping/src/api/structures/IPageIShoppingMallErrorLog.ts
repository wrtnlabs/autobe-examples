import { IPage } from "./IPage";
import { IShoppingMallErrorLog } from "./IShoppingMallErrorLog";

export namespace IPageIShoppingMallErrorLog {
  /**
   * Paginated collection of application error log summary entries for the
   * shoppingMall platform.
   *
   * This container wraps a page of `IShoppingMallErrorLog.ISummary` records
   * along with pagination information and is returned by the
   * `/shoppingMall/platformAdmin/errorLogs` index operation. It represents
   * the filtered, sorted, and paginated view of rows stored in the
   * `shopping_mall_error_logs` Prisma table based on the search criteria
   * supplied in `IShoppingMallErrorLog.IRequest`.
   *
   * Administrative consoles, observability dashboards, and incident
   * investigation tools use this structure to browse and triage error logs
   * over time. The `pagination` object feeds paging controls and total count
   * indicators, while the `data` array provides the individual error
   * summaries that can be clicked or expanded to access more detailed error
   * information via dedicated detail endpoints.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of error log
     * results.
     *
     * Includes the current page index, page size, total number of error log
     * entries that matched the filters, and the computed total number of
     * pages. This information is derived from querying the
     * `shopping_mall_error_logs` table using the criteria in
     * `IShoppingMallErrorLog.IRequest`.
     */
    pagination: IPage.IPagination;

    /**
     * Array of error log summary DTOs for the current page.
     *
     * Each element is an `IShoppingMallErrorLog.ISummary` instance
     * representing a single error or exception event recorded in the
     * `shopping_mall_error_logs` Prisma model. Summaries typically surface
     * fields such as occurrence time, severity, error code or category,
     * short message, and correlation identifiers so that operators can
     * quickly identify and prioritize issues without loading full stack
     * traces or large diagnostic payloads.
     */
    data: IShoppingMallErrorLog.ISummary[];
  };
}
