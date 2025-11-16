import { IPage } from "./IPage";
import { IShoppingMallDisputeResolutionLog } from "./IShoppingMallDisputeResolutionLog";

export namespace IPageIShoppingMallDisputeResolutionLog {
  /**
   * Paginated collection of dispute resolution log summaries for audit and
   * support analysis.
   *
   * This schema packages a list of
   * `IShoppingMallDisputeResolutionLog.ISummary` records together with
   * `IPage.IPagination` metadata, representing one page of results from
   * queries over the `shopping_mall_dispute_resolution_logs` model. It is
   * primarily returned by platform administrator endpoints that browse,
   * audit, or analyze how order disputes have been resolved over time.
   *
   * The `pagination` object communicates the overall result size and paging
   * position so that back‑office tools can implement list navigation and
   * reporting, while the `data` array holds the individual log entries for
   * the current slice. Consumers typically render these records in
   * chronological tables or investigative timelines and may follow links from
   * each summary to more detailed dispute or order views.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this dispute resolution log page.
     *
     * This follows the shared `IPage.IPagination` contract and describes
     * the current page index, requested page size, total number of matching
     * dispute resolution log records, and total pages. It enables
     * administrative and compliance tooling to navigate large audit trails
     * of dispute handling activity efficiently.
     */
    pagination: IPage.IPagination;

    /**
     * Array of dispute resolution log summary records included in the
     * current page.
     *
     * Each element is an `IShoppingMallDisputeResolutionLog.ISummary`
     * object summarizing a single resolution event from the
     * `shopping_mall_dispute_resolution_logs` table, including actor type,
     * outcome, and key timestamps. The array may be empty if no logs match
     * the search filters or if the requested page falls beyond the
     * available range, but `pagination.records` still reports the total
     * result set size for the query.
     */
    data: IShoppingMallDisputeResolutionLog.ISummary[];
  };
}
