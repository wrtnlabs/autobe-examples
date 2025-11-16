import { IPage } from "./IPage";
import { IShoppingMallAccessLog } from "./IShoppingMallAccessLog";

export namespace IPageIShoppingMallAccessLog {
  /**
   * Paginated collection of access log summary entries for the shoppingMall
   * platform.
   *
   * This DTO wraps a set of `IShoppingMallAccessLog.ISummary` objects
   * together with pagination metadata so that callers of the
   * `/shoppingMall/platformAdmin/accessLogs` endpoint can efficiently browse
   * large volumes of access logs. It is backed by the
   * `shopping_mall_access_logs` Prisma model and reflects the result of
   * applying search filters, time range constraints, and sorting options
   * defined in `IShoppingMallAccessLog.IRequest`.
   *
   * Admin consoles, security monitoring tools, and performance dashboards
   * typically bind directly to this structure: `pagination` is used to drive
   * paging controls, while `data` provides the current page of access log
   * summaries for visualization, export, or drill-down into more detailed log
   * views.
   */
  export type ISummary = {
    /**
     * Pagination information for the current slice of access log data.
     *
     * This object reports the current page index, page size, total number
     * of matching access log records, and the total number of pages. It is
     * derived from the underlying query against the
     * `shopping_mall_access_logs` table using the filters supplied in
     * `IShoppingMallAccessLog.IRequest`.
     */
    pagination: IPage.IPagination;

    /**
     * List of access log summary records included in this page.
     *
     * Each item is an `IShoppingMallAccessLog.ISummary` DTO, representing a
     * lightweight projection of a single row from the
     * `shopping_mall_access_logs` Prisma model. These summaries typically
     * expose key fields such as timestamp, HTTP method, path, status code,
     * actor type, IP address, and user agent, allowing platform
     * administrators to quickly scan and analyze request traffic without
     * loading full log payloads for every row.
     */
    data: IShoppingMallAccessLog.ISummary[];
  };
}
