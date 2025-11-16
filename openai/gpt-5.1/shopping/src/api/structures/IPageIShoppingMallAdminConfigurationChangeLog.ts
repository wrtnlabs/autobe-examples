import { IPage } from "./IPage";
import { IShoppingMallAdminConfigurationChangeLog } from "./IShoppingMallAdminConfigurationChangeLog";

export namespace IPageIShoppingMallAdminConfigurationChangeLog {
  /**
   * Paginated collection of administrative configuration change log summary
   * records.
   *
   * This DTO is used as the response body for endpoints such as `PATCH
   * /shoppingMall/platformAdmin/adminConfigurationChangeLogs` and `PATCH
   * /shoppingMall/platformAdmin/analytics/adminConfigurations`, which query
   * the `shopping_mall_admin_configuration_change_logs` Prisma model based on
   * filters supplied in `IShoppingMallAdminConfigurationChangeLog.IRequest`.
   *
   * The `pagination` property carries standard page information (current
   * page, limit, total records, and pages) so that admin UIs can render
   * paging controls, while the `data` array holds
   * `IShoppingMallAdminConfigurationChangeLog.ISummary` entries representing
   * each configuration change within the current page. This structure is
   * optimized for audit and analytics dashboards that need to scan
   * configuration history without loading the entire log at once.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of configuration change log
     * records.
     *
     * This property uses the standard `IPage.IPagination` DTO, providing
     * the 1‑based current page index, the page size limit, the total number
     * of configuration change logs that satisfy the filters, and the total
     * page count. It enables admin consoles and analytics views to
     * implement consistent paging behavior across change-history screens.
     */
    pagination: IPage.IPagination;

    /**
     * Array of configuration change log summaries belonging to the
     * requested page.
     *
     * Each element is an
     * `IShoppingMallAdminConfigurationChangeLog.ISummary` instance that
     * summarizes a single row from the
     * `shopping_mall_admin_configuration_change_logs` Prisma table,
     * including the acting administrator, configuration scope, key, change
     * type, short description, and creation timestamp.
     *
     * If the applied filters do not match any configuration change records,
     * this array is empty while `pagination` still reports the paging
     * context and total record count.
     */
    data: IShoppingMallAdminConfigurationChangeLog.ISummary[];
  };
}
