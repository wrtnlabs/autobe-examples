import { IPage } from "./IPage";
import { IShoppingMallShippingZoneSetting } from "./IShoppingMallShippingZoneSetting";

export namespace IPageIShoppingMallShippingZoneSetting {
  /**
   * Paginated collection of shipping zone configuration summaries for the
   * shopping mall platform.
   *
   * This schema wraps the results of search and listing operations over the
   * `shopping_mall_shipping_zone_settings` table, as exposed by the PATCH
   * `/shoppingMall/platformAdmin/shippingZoneSettings` endpoint. It combines
   * standardized pagination metadata with an array of
   * `IShoppingMallShippingZoneSetting.ISummary` items so that platform
   * administrators can efficiently browse, filter, and locate shipping zone
   * configurations used in logistics and pricing workflows.
   *
   * By separating pagination concerns into the `pagination` property and
   * individual zone details into the `data` array, the API maintains a
   * consistent response model across list endpoints and enables admin tools
   * to implement reusable table, infinite-scroll, or export behaviors without
   * needing to understand the underlying Prisma implementation details.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of shipping zone search
     * results.
     *
     * This object follows the shared `IPage.IPagination` schema and exposes
     * values such as the current page number, page size, total number of
     * matching records, and total page count. Clients use these fields to
     * drive pagination UI controls (for example, next/previous buttons and
     * page indicators) when browsing `shopping_mall_shipping_zone_settings`
     * entries in an admin console.
     *
     * When combined with the `data` array, this metadata allows platform
     * administrators and logistics operators to understand how many
     * shipping zones match the current filter criteria and how the current
     * page fits into the overall result set.
     */
    pagination: IPage.IPagination;

    /**
     * List of shipping zone configuration summaries returned for the
     * requested page.
     *
     * Each element in this array is an
     * `IShoppingMallShippingZoneSetting.ISummary` instance, representing a
     * lightweight view of a single record from the
     * `shopping_mall_shipping_zone_settings` Prisma model. These summaries
     * typically include the zone code, display name, active flag, and
     * primary associated region so that administrative UIs can render
     * concise tables without loading the full configuration.
     *
     * The array may be empty when no records match the provided
     * `IShoppingMallShippingZoneSetting.IRequest` filters or when the
     * requested page is beyond the end of the result set, but it is always
     * present together with the `pagination` object.
     */
    data: IShoppingMallShippingZoneSetting.ISummary[];
  };
}
