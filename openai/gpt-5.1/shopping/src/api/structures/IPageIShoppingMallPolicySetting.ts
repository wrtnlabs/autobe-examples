import { IPage } from "./IPage";
import { IShoppingMallPolicySetting } from "./IShoppingMallPolicySetting";

export namespace IPageIShoppingMallPolicySetting {
  /**
   * Paginated collection of shopping mall policy setting profile summaries.
   *
   * This schema wraps a list of `IShoppingMallPolicySetting.ISummary` DTOs
   * together with `IPage.IPagination` metadata, representing the result of
   * searching or listing records from the `shopping_mall_policy_settings`
   * Prisma model. It is typically used as the response body for admin and
   * backoffice endpoints such as PATCH
   * `/shoppingMall/platformAdmin/policySettings`, where platform
   * administrators browse and manage high-level policy setting profiles.
   *
   * The `data` array holds the individual policy setting summaries for the
   * current page, and `pagination` describes how this page fits into the
   * overall result set. When no profiles match the search criteria, `data`
   * will be an empty array while `pagination.records` will be zero, allowing
   * clients to render a consistent but empty list state.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of policy setting profiles.
     *
     * This field uses the shared `IPage.IPagination` schema to express the
     * current page index, page size limit, total number of matching
     * `shopping_mall_policy_settings` rows, and the total number of pages.
     * Admin and backoffice UIs rely on this information to render page
     * navigators when browsing policy setting profiles.
     *
     * In the context of `shopping_mall_policy_settings`, the `records`
     * count and related fields refer specifically to policy setting
     * profiles that match the search criteria applied to fields such as
     * `code`, `name`, `category`, `active`, and effective period
     * timestamps.
     */
    pagination: IPage.IPagination;

    /**
     * List of policy setting profile summaries returned for the current
     * page.
     *
     * Each element is an `IShoppingMallPolicySetting.ISummary` DTO, which
     * provides a lightweight view of a record from the
     * `shopping_mall_policy_settings` Prisma table. These summaries expose
     * key identification and classification fields (such as `id`, `code`,
     * `name`, `category`, `active`, `created_at`, and `updated_at`) without
     * materializing heavy configuration payloads like `config_payload`.
     *
     * The array may be empty when no profiles match the applied filters,
     * but the `pagination` field is still populated so clients can
     * distinguish between an empty result and the absence of paging
     * information.
     */
    data: IShoppingMallPolicySetting.ISummary[];
  };
}
