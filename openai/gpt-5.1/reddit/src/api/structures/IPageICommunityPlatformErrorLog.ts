import { IPage } from "./IPage";
import { ICommunityPlatformErrorLog } from "./ICommunityPlatformErrorLog";

export namespace IPageICommunityPlatformErrorLog {
  /**
   * Paginated container of error log summaries for reliability and operations
   * analytics.
   *
   * This schema is the standard page wrapper returned by endpoints such as
   * PATCH `/communityPlatform/platformAdmin/errorLogs` and
   * `/communityPlatform/platformAdmin/analytics/errorLogs`. It couples
   * generic pagination metadata from `IPage.IPagination` with a list of
   * `ICommunityPlatformErrorLog.ISummary` items derived from the
   * `community_platform_error_logs` Prisma table.
   *
   * Platform administrators and operations staff rely on this structure to
   * scroll through large volumes of system-generated error events, apply
   * filters and time windows, and quickly locate specific failures or
   * patterns while preserving efficient, predictable pagination over the
   * underlying log data.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current page of error log results.
     *
     * This object conforms to the shared `IPage.IPagination` schema and
     * includes fields such as the current page number, page size, total
     * record count, and total number of pages.
     *
     * Operational dashboards and troubleshooting tools use this information
     * to navigate through long histories of error events stored in
     * `community_platform_error_logs` and to implement predictable paging
     * behavior in the UI.
     */
    pagination: IPage.IPagination;

    /**
     * Array of error log summary records included in the current page.
     *
     * Each element is an `ICommunityPlatformErrorLog.ISummary` DTO
     * representing a single row from the `community_platform_error_logs`
     * Prisma model, exposing identifiers, timestamps, severity, service or
     * component name, error codes, and user-facing messages suitable for
     * list or dashboard displays.
     *
     * The array may be empty when filters applied via
     * `ICommunityPlatformErrorLog.IRequest` yield no matching records or
     * when the caller requests a page index beyond the available data
     * range, but the property is always present in a valid page response.
     */
    data: ICommunityPlatformErrorLog.ISummary[];
  };
}
