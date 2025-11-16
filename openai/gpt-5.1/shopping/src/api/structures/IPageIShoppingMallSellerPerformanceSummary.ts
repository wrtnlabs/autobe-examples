import { IPage } from "./IPage";
import { IShoppingMallSellerPerformanceSummary } from "./IShoppingMallSellerPerformanceSummary";

export namespace IPageIShoppingMallSellerPerformanceSummary {
  /**
   * Paginated collection of seller performance summaries for administrative
   * analytics.
   *
   * This schema wraps a list of
   * `IShoppingMallSellerPerformanceSummary.ISummary` records together with
   * `IPage.IPagination` metadata, representing a single page of results from
   * queries against the `shopping_mall_seller_performance_summaries` model.
   * It is used by platform administrator endpoints that search or analyze
   * seller performance and risk indicators over time.
   *
   * The `pagination` object communicates how results are sliced across pages,
   * including page index, page size, total records, and total pages, while
   * the `data` array carries the actual summary rows for the requested page.
   * Clients typically iterate over `data` to render table rows or dashboard
   * tiles and use `pagination` to drive paging controls, exports, or further
   * drill‑down navigation.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this seller performance summary page.
     *
     * This object follows the shared `IPage.IPagination` contract and
     * describes the current page index, page size, total record count, and
     * total number of pages for the underlying seller performance
     * snapshots. It allows admin dashboards and analytics tools to render
     * paging controls, infinite scrolling, or batch export flows based on
     * the total number of available summaries.
     */
    pagination: IPage.IPagination;

    /**
     * Array of seller performance summary records in the current page.
     *
     * Each element is an `IShoppingMallSellerPerformanceSummary.ISummary`
     * instance, representing a precomputed performance and risk snapshot
     * for a single seller over a given period. The array may be empty when
     * filters match no sellers or when requesting a page beyond the
     * available range, while `pagination.records` still reflects the total
     * count for the criteria.
     */
    data: IShoppingMallSellerPerformanceSummary.ISummary[];
  };
}
