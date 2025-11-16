import { IPage } from "./IPage";
import { IShoppingMallOrderItem } from "./IShoppingMallOrderItem";

export namespace IPageIShoppingMallOrderItem {
  /**
   * Page wrapper for paginated search results of shopping mall order items,
   * powering analytical dashboards, support consoles, and order breakdown
   * reporting.
   *
   * This schema encapsulates a collection of compact order item summaries
   * (each representing a purchased SKU/product per order) and the complete
   * paging information necessary for batch navigation, export, and UI data
   * fetching.
   *
   * Guarantees delivery of fully-typed batch results even on empty/exhausted
   * queries, supporting advanced operational and management workflows in the
   * shopping mall platform.
   */
  export type ISummary = {
    /**
     * Batch page metadata describing the result window for a filtered,
     * paginated group of order item summaries. Contains index, size, and
     * total count for client navigation and reporting workflows. Based on
     * the standard IPage.IPagination object for administrative/analytics
     * consistency across the shopping mall domain.
     *
     * Never null, missing, or omitted. Used for rendering paged lists in
     * management UIs or exporting order item breakdown reports.
     */
    pagination: IPage.IPagination;

    /**
     * Array of shopping mall order item summary DTOs in the current
     * paginated result window. Each record provides key information about a
     * product or SKU included in a customer order, intended for efficient
     * consumption in analytics/reporting interfaces and detailed
     * fulfillment review contexts.
     *
     * Strictly non-null and always present, even when empty. Used in list
     * and batch result views for customer service, reporting tools, and
     * operational dashboards.
     */
    data: IShoppingMallOrderItem.ISummary[];
  };
}
