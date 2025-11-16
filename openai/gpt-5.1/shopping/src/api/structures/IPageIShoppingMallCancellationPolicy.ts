import { IPage } from "./IPage";
import { IShoppingMallCancellationPolicy } from "./IShoppingMallCancellationPolicy";

export namespace IPageIShoppingMallCancellationPolicy {
  /**
   * Paginated list of shopping mall cancellation policy summaries.
   *
   * This schema represents a single page of results produced when querying
   * the `shopping_mall_cancellation_policies` table, typically through search
   * endpoints such as PATCH `/shoppingMall/cancellationPolicies`. It combines
   * `IPage.IPagination` metadata with an array of
   * `IShoppingMallCancellationPolicy.ISummary` items to provide both
   * navigation information and the actual cancellation policy data needed for
   * list views, dashboards, and audit workflows.
   *
   * The `data` collection contains only summary-level information for each
   * cancellation policy, making it efficient to transfer and render in
   * administrative UIs. Consumers that require full detail can follow up by
   * calling more specific endpoints using the identifiers exposed in each
   * summary.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of cancellation policy
     * records.
     *
     * This property uses the common `IPage.IPagination` contract to expose
     * the current page index, page size, total number of matching rows in
     * `shopping_mall_cancellation_policies`, and total pages.
     * Administrative tools and reporting UIs depend on these values to
     * implement robust paging controls when listing cancellation policies.
     *
     * All pagination counts and offsets are computed with respect to the
     * filters applied to `shopping_mall_cancellation_policies`, including
     * constraints on business code, active flag, region linkage, effective
     * time windows, and full-text search terms over `name` and
     * `description`.
     */
    pagination: IPage.IPagination;

    /**
     * Array of cancellation policy summaries that belong to the current
     * page of results.
     *
     * Each element is an `IShoppingMallCancellationPolicy.ISummary` DTO
     * backed by a row in the `shopping_mall_cancellation_policies` Prisma
     * model. These summaries surface the key behavior-defining fields (for
     * example, `code`, `name`, `isActive`, `maxHoursAfterPayment`, and
     * flags for pre‑shipment and partial cancellation), and may also embed
     * compact region and policy-setting context via
     * `IShoppingMallRegionSetting.ISummary` and
     * `IShoppingMallPolicySetting.ISummary`.
     *
     * When no cancellation policies satisfy the search criteria, this array
     * is empty but still present, and `pagination` communicates that there
     * are zero records, ensuring a predictable contract for clients
     * iterating over the collection.
     */
    data: IShoppingMallCancellationPolicy.ISummary[];
  };
}
