import { IPage } from "./IPage";
import { IShoppingMallReviewPolicy } from "./IShoppingMallReviewPolicy";

export namespace IPageIShoppingMallReviewPolicy {
  /**
   * Paginated list of review policy summary records used in administrative
   * management screens.
   *
   * This schema is the response body for endpoints such as `PATCH
   * /shoppingMall/platformAdmin/reviewPolicies`, which search the
   * `shopping_mall_review_policies` Prisma table by code, name, active flag,
   * region, policy profile, and effective period. The `pagination` object
   * provides standard page-level statistics, and the `data` array contains
   * `IShoppingMallReviewPolicy.ISummary` items representing individual review
   * and rating policies.
   *
   * Platform administrators rely on this page envelope to browse, filter, and
   * audit review policies, quickly understand which rules are in effect for
   * different regions or configurations, and navigate to dedicated detail and
   * edit endpoints without loading full configuration payloads for every row
   * in the list.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current page of review policy
     * results.
     *
     * This `IPage.IPagination` object reports the current page index, page
     * size, total number of matching review policy records, and total page
     * count. It is derived from the query executed against the
     * `shopping_mall_review_policies` Prisma model using search and filter
     * parameters supplied by `IShoppingMallReviewPolicy.IRequest`.
     */
    pagination: IPage.IPagination;

    /**
     * Array of review policy summary entries for the requested page.
     *
     * Each element is an `IShoppingMallReviewPolicy.ISummary` DTO that
     * summarizes a single row in the `shopping_mall_review_policies` table,
     * exposing key fields such as code, name, activation state, effective
     * period, and important numeric thresholds. The list intentionally
     * omits heavy configuration payloads and opaque `config_payload` data,
     * which are instead retrieved via dedicated detail endpoints when
     * deeper inspection or editing is required.
     */
    data: IShoppingMallReviewPolicy.ISummary[];
  };
}
