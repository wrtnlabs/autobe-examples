import { IPage } from "./IPage";
import { IShoppingMallAgeRestrictionPolicy } from "./IShoppingMallAgeRestrictionPolicy";

export namespace IPageIShoppingMallAgeRestrictionPolicy {
  /**
   * Paginated collection of age restriction policy summaries for
   * administrative search results.
   *
   * This DTO is used as the response body for the PATCH
   * `/shoppingMall/platformAdmin/ageRestrictionPolicies` endpoint. It wraps
   * pagination metadata together with an array of
   * `IShoppingMallAgeRestrictionPolicy.ISummary` items, which are derived
   * from the `shopping_mall_age_restriction_policies` Prisma model and
   * represent concise views of age restriction policies configured in the
   * shoppingMall platform.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the age restriction policy index.
     *
     * This object follows the `IPage.IPagination` structure and describes
     * which slice of age restriction policy records is being returned,
     * including the current page number, page size, total number of
     * matching policies, and the total page count computed from the
     * `shopping_mall_age_restriction_policies` table.
     */
    pagination: IPage.IPagination;

    /**
     * List of age restriction policy summary records for the current page.
     *
     * Each element is an `IShoppingMallAgeRestrictionPolicy.ISummary` DTO
     * that exposes key identifying and decision-making fields for an age
     * restriction policy, such as its business code, display name, minimum
     * age requirement, activation status, and high-level scoping context
     * (for example associated region or policy setting). These summaries
     * are optimized for administrative list views, not for full-detail
     * editing forms.
     */
    data: IShoppingMallAgeRestrictionPolicy.ISummary[];
  };
}
