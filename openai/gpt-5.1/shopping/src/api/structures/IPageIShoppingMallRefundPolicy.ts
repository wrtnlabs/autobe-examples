import { IPage } from "./IPage";
import { IShoppingMallRefundPolicy } from "./IShoppingMallRefundPolicy";

export namespace IPageIShoppingMallRefundPolicy {
  /**
   * Paginated collection of refund policy summary records for administrative
   * search views.
   *
   * This schema represents the response envelope returned by endpoints such
   * as `PATCH /shoppingMall/platformAdmin/refundPolicies`, which search the
   * `shopping_mall_refund_policies` Prisma table using rich filter criteria
   * (`IShoppingMallRefundPolicy.IRequest`). The `pagination` property carries
   * standard page metadata, while `data` holds the list of
   * `IShoppingMallRefundPolicy.ISummary` objects for the current page.
   *
   * Administrators use this structure to render grid or table views of refund
   * policies, to navigate between pages of results, and to drill into
   * individual policies via separate detail, create, and update endpoints
   * without loading full configuration payloads in the list response.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of refund policy results.
     *
     * This object follows the `IPage.IPagination` structure and describes
     * which page of data is being returned, how many records are included
     * per page, how many records exist in total for the current filter set,
     * and how many pages can be navigated.
     *
     * The values are computed from the underlying query executed against
     * the `shopping_mall_refund_policies` Prisma model using the filters
     * supplied via `IShoppingMallRefundPolicy.IRequest`.
     */
    pagination: IPage.IPagination;

    /**
     * List of refund policy summary records contained in the current page.
     *
     * Each element is an `IShoppingMallRefundPolicy.ISummary` DTO
     * representing a single row from the `shopping_mall_refund_policies`
     * table, projected into a lightweight summary view suitable for
     * administrative list and grid screens. Heavy configuration payloads
     * and implementation details are intentionally omitted from these
     * summary items to keep page responses compact and focused on key
     * decision-making fields such as code, name, activation status, and
     * important thresholds.
     */
    data: IShoppingMallRefundPolicy.ISummary[];
  };
}
